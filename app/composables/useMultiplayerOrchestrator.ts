import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import { useGameDataStore } from '~~/stores/gameDataStore'
import type { PlayerKey } from '~~/stores/playerStore'
import { usePlayerStore } from '~~/stores/playerStore'
import type { GameStatus, MultiplayerGame } from '~~/types/profile'

type SnapshotMetadata = {
  terminalStatus?: GameStatus | null
}

type MultiplayerMeta = {
  isNew: boolean
  gameId: string
  p1: string
  p2: string
  activePlayerUid: string
}

type RemoteUpdateHandler = (game: MultiplayerGame) => Promise<void>

export const useMultiplayerOrchestrator = () => {
  const { t } = useI18n()
  const { localKey, selfKey, opponentKey, isMultiplayerGame } = useLocalPlayerPerspective()
  const { setOpponentPlayer, subscribeToGame } = useMultiplayerMatch()
  const { subscribeToOpponentPresence } = usePresence()
  const {
    saveMultiplayerGame,
    syncMultiplayerGame,
    initializeSync,
  } = useStoreManager()
  const { current: currentProfile } = useProfile()

  const ps = usePlayerStore()
  const ds = useGameDataStore()

  const terminalStatus = useState<GameStatus | null>('terminal-status', () => null)

  const gameUnsubscribe = ref<(() => void) | null>(null)

  /**
   * Push a multiplayer snapshot to Firestore reflecting the current local state.
   * Used after key transitions: turn hand-off, new round start, and round end.
   */
  const pushSnapshot = async (
    context: string,
    activeKeyOverride?: PlayerKey,
    metadata?: SnapshotMetadata,
  ) => {
    if (!isMultiplayerGame.value) return

    const multiplayerMeta = useState<MultiplayerMeta>('multiplayer-game-meta', () => ({
      isNew: false,
      gameId: '',
      p1: '',
      p2: '',
      activePlayerUid: '',
    }))

    if (!currentProfile.value || !multiplayerMeta.value.gameId) return

    const p1 = multiplayerMeta.value.p1
    const p2 = multiplayerMeta.value.p2
    const activeKey = activeKeyOverride ?? (ps.activePlayer.id as PlayerKey)
    const activeUid = activeKey === 'p1' ? p1 : p2

    // Only participants should push
    if (currentProfile.value.uid !== p1 && currentProfile.value.uid !== p2) return

    const plainMetadata: SnapshotMetadata = {
      terminalStatus: metadata?.terminalStatus ?? terminalStatus.value ?? null,
    }

    try {
      await saveMultiplayerGame(p1, p2, activeUid, plainMetadata)
    } catch (error) {
      console.error(`Failed to save multiplayer snapshot (${context}):`, error)
    }
  }

  /**
   * Initialize a brand new multiplayer game.
   * @param callbacks - Functions from index.vue that manage local state
   */
  const initGame = async (callbacks: {
    resetAllStores: () => void
    startRound: () => Promise<void>
  }, onRemoteUpdate: RemoteUpdateHandler) => {
    const multiplayerMeta = useState<MultiplayerMeta>('multiplayer-game-meta', () => ({
      isNew: false,
      gameId: '',
      p1: '',
      p2: '',
      activePlayerUid: '',
    }))

    if (!multiplayerMeta.value.isNew || !multiplayerMeta.value.gameId) {
      callbacks.resetAllStores()
      await callbacks.startRound()
      return
    }

    const currentUid = currentProfile.value?.uid
    const isStarter = currentUid && currentUid === multiplayerMeta.value.activePlayerUid
    const { gameId } = storeToRefs(ds)

    // Ensure the game data store uses the canonical multiplayer gameId from Firestore
    if (multiplayerMeta.value.gameId && gameId.value !== multiplayerMeta.value.gameId) {
      gameId.value = multiplayerMeta.value.gameId
    }

    // Set local player perspective for multiplayer
    if (
      currentUid &&
      (currentUid === multiplayerMeta.value.p1 || currentUid === multiplayerMeta.value.p2)
    ) {
      localKey.value = currentUid === multiplayerMeta.value.p1 ? 'p1' : 'p2'
      isMultiplayerGame.value = true
    } else {
      localKey.value = 'p1'
      isMultiplayerGame.value = false
    }

    terminalStatus.value = null

    // Ensure sync adapters are ready
    initializeSync()

    if (isStarter) {

      // Start with a clean state and run normal round initialization
      callbacks.resetAllStores()
      // Ensure the correct starting player is reflected in state
      ps.reset(localKey.value)

      await callbacks.startRound()

      try {
        await saveMultiplayerGame(
          multiplayerMeta.value.p1,
          multiplayerMeta.value.p2,
          multiplayerMeta.value.activePlayerUid,
        )
      } catch (error) {
        console.error('Failed to save multiplayer game from starting player:', error)
      }
    } else {
      try {
        const maxAttempts = 3
        let synced = false

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          synced = await syncMultiplayerGame(multiplayerMeta.value.gameId)
          if (synced) {
            break
          }
          // Small delay before retrying to give starter time to push state
          await sleep(1000)
        }

        if (!synced) {
          console.error(
            `[initGame] Failed to sync multiplayer game after ${maxAttempts} attempts`,
            multiplayerMeta.value.gameId,
          )
          toast.error(t('multiplayer.sync_error_retry'), { duration: 8000 })
        }
      } catch (error) {
        console.error('Failed to sync/load multiplayer game for non-starting player:', error)
        toast.error(t('multiplayer.sync_error'), { duration: 8000 })
      }
    }

    // Fetch opponent profile after store resets so it doesn't get cleared
    if (isMultiplayerGame.value) {
      await setOpponentPlayer(multiplayerMeta.value[opponentKey.value])
    }

    // Mark meta as no longer "new" so subsequent starts use regular resume/new logic
    multiplayerMeta.value.isNew = false

    // Subscribe to game document to receive remote updates
    if (gameUnsubscribe.value) {
      gameUnsubscribe.value()
    }

    gameUnsubscribe.value = subscribeToGame(multiplayerMeta.value.gameId, onRemoteUpdate)

    // Subscribe to opponent's presence
    const opponentUid = multiplayerMeta.value[opponentKey.value]
    if (opponentUid) {
      subscribeToOpponentPresence(opponentUid)
    }
  }

  /**
   * Rejoin an existing multiplayer game after a page refresh or disconnect.
   * Re-establishes Firestore subscription, presence tracking, and syncs latest state.
   */
  const rejoinGame = async (
    onRemoteUpdate: RemoteUpdateHandler,
  ) => {
    const multiplayerMeta = useState<MultiplayerMeta>('multiplayer-game-meta', () => ({
      isNew: false,
      gameId: '',
      p1: '',
      p2: '',
      activePlayerUid: '',
    }))

    if (!multiplayerMeta.value.gameId) {
      return
    }

    const currentUid = currentProfile.value?.uid
    if (!currentUid) {
      return
    }

    // Validate current user is a participant
    if (currentUid !== multiplayerMeta.value.p1 && currentUid !== multiplayerMeta.value.p2) {
      console.error('rejoinGame: current user is not a participant')
      return
    }

    const { initializePresence } = usePresence()
    const { setOpponentPlayer } = useMultiplayerMatch()

    // Set local player perspective
    localKey.value = currentUid === multiplayerMeta.value.p1 ? 'p1' : 'p2'
    isMultiplayerGame.value = true

    // Set opponent player profile
    await setOpponentPlayer(multiplayerMeta.value[opponentKey.value])

    // Ensure sync adapters are ready
    initializeSync()

    // Sync latest state from Firestore
    const synced = await syncMultiplayerGame(multiplayerMeta.value.gameId)
    if (!synced) {
      toast.error(t('multiplayer.sync_error'), { duration: 8000 })
    }

    // Clean up any existing subscription
    if (gameUnsubscribe.value) {
      gameUnsubscribe.value()
    }

    // Subscribe to real-time updates
    gameUnsubscribe.value = subscribeToGame(multiplayerMeta.value.gameId, onRemoteUpdate)

    // Initialize presence
    await initializePresence(multiplayerMeta.value.gameId)

    // Subscribe to opponent presence
    const opponentUid = multiplayerMeta.value[opponentKey.value]
    if (opponentUid) {
      subscribeToOpponentPresence(opponentUid)
    }

    // Load opponent profile
  }

  /**
   * Clean up multiplayer subscriptions.
   */
  const cleanupSubscription = () => {
    if (gameUnsubscribe.value) {
      gameUnsubscribe.value()
      gameUnsubscribe.value = null
    }
  }

  return {
    pushSnapshot,
    initGame,
    rejoinGame,
    cleanupSubscription,
    terminalStatus,
  }
}
