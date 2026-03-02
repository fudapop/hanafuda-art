import { storeToRefs } from 'pinia'
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
      console.info(`Multiplayer snapshot saved (${context})`, {
        gameId: multiplayerMeta.value.gameId,
        p1,
        p2,
        activePlayerUid: activeUid,
        terminalStatus: plainMetadata.terminalStatus,
      })
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
      console.warn('initGame called without multiplayer meta; falling back')
      callbacks.resetAllStores()
      await callbacks.startRound()
      return
    }

    const currentUid = currentProfile.value?.uid
    const isStarter = currentUid && currentUid === multiplayerMeta.value.activePlayerUid
    const { gameId } = storeToRefs(ds)

    // Ensure the game data store uses the canonical multiplayer gameId from Firestore
    if (multiplayerMeta.value.gameId && gameId.value !== multiplayerMeta.value.gameId) {
      console.debug('[initGame] Syncing local gameId to multiplayer meta', {
        previousGameId: gameId.value,
        multiplayerGameId: multiplayerMeta.value.gameId,
      })
      gameId.value = multiplayerMeta.value.gameId
    }

    // Set local player perspective for multiplayer
    if (
      currentUid &&
      (currentUid === multiplayerMeta.value.p1 || currentUid === multiplayerMeta.value.p2)
    ) {
      localKey.value = currentUid === multiplayerMeta.value.p1 ? 'p1' : 'p2'
      await setOpponentPlayer(multiplayerMeta.value[opponentKey.value])
      isMultiplayerGame.value = true
    } else {
      localKey.value = 'p1'
      isMultiplayerGame.value = false
    }

    terminalStatus.value = null

    // Ensure sync adapters are ready
    initializeSync()

    if (isStarter) {
      console.info('Initializing new multiplayer game as starting player', multiplayerMeta.value)

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
        console.info('Multiplayer game state saved and pushed by starting player')
      } catch (error) {
        console.error('Failed to save multiplayer game from starting player:', error)
      }
      console.log('STARTER INITIALIZED', Date.now())
    } else {
      console.info(
        'Joining new multiplayer game as non-starting player, syncing from remote state',
        multiplayerMeta.value,
      )

      try {
        const maxAttempts = 3

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const synced = await syncMultiplayerGame(multiplayerMeta.value.gameId)
          if (synced) {
            break
          }
          console.warn(
            `Multiplayer game ${multiplayerMeta.value.gameId} not yet initialized by starter (attempt ${attempt + 1}/${maxAttempts})`,
          )

          // Small delay before retrying to give starter time to push state
          await sleep(1000)
        }
        console.log('NON-STARTER INITIALIZED', Date.now())
      } catch (error) {
        console.error('Failed to sync/load multiplayer game for non-starting player:', error)
      }
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
      console.info(`[Multiplayer] Subscribed to opponent presence: ${opponentUid}`)
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
      console.warn('rejoinGame called without multiplayer meta')
      return
    }

    const currentUid = currentProfile.value?.uid
    if (!currentUid) {
      console.warn('rejoinGame called without authenticated user')
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
      console.warn('Failed to sync multiplayer game during rejoin')
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
      console.info(`[Multiplayer Rejoin] Subscribed to opponent presence: ${opponentUid}`)
    }

    // Load opponent profile
    console.info('[Multiplayer Rejoin] Successfully rejoined game', multiplayerMeta.value.gameId)
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
