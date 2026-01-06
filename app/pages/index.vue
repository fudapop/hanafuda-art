<template>
  <GameLayout>
    <div class="isolate">
      <div
        v-show="showLoader"
        class="fixed top-1/3 -translate-y-1/2 inset-x-0 mx-auto pointer-events-none z-1"
      >
        <CardsLoader />
      </div>

      <!-- OPPONENT HAND -->
      <div class="absolute inset-x-0 top-0 h-28">
        <OpponentArea />
      </div>

      <!-- OPPONENT COLLECTION -->
      <div
        :class="[
          'absolute inset-x-0 -translate-y-3/4 top-1/4',
          // 'lg:inset-x-auto lg:right-0'
        ]"
      >
        <div class="w-screen max-w-3xl mx-auto overflow-x-auto touch-pan-x no-scrollbar">
          <CollectionArea
            :player="opponentKey"
            @completed="handleCompletion"
          />
        </div>
      </div>

      <!-- FIELD -->
      <div :class="['absolute inset-x-0 max-w-2xl top-1/4 w-max mx-auto isolate -z-10']">
        <div class="w-screen overflow-x-auto touch-pan-x no-scrollbar">
          <div
            v-click-disabled:unless="players[selfKey].isActive && !!selectedCard"
            :class="[
              'grid grid-cols-[80px_1fr] gap-2',
              'py-8 px-4 sm:px-8 lg:px-12',
              'transition-transform duration-200 origin-left scale-75 sm:scale-100',
            ]"
          >
            <Deck />
            <FieldDisplay />
          </div>
        </div>
      </div>

      <!-- PLAYER COLLECTION -->
      <div
        :class="[
          'absolute inset-x-0 bottom-1/4',
          // 'lg:inset-x-auto lg:right-0'
        ]"
      >
        <div class="w-screen max-w-3xl mx-auto overflow-x-auto touch-pan-x no-scrollbar">
          <CollectionArea
            :player="selfKey"
            @completed="handleCompletion"
          />
        </div>
      </div>

      <!-- PLAYER HAND -->
      <div
        :class="[
          'absolute -bottom-4 inset-x-0 pb-8',
          'transition-all duration-200 origin-left [&_ul]:scale-90 sm:[&_ul]:scale-100',
          players[opponentKey].isActive && 'opacity-80',
          isMobile && 'landscape:translate-y-8',
        ]"
      >
        <div
          class="w-screen max-w-full py-8 mx-auto overflow-x-auto overflow-y-visible no-scrollbar touch-pan-x"
        >
          <div>
            <HandDisplay
              :id="selfKey"
              :can-interact="canInteractLocalHand"
            />
          </div>
        </div>
      </div>

      <!-- KOI-KOI SHOUT -->
      <Shout
        v-if="!!shoutTimeout && getCaller !== null"
        :called-by="getCaller!"
        msg="KOI KOI"
      />

      <!-- ACTION LOG -->
      <EventLog />

      <ResultsModal :show="showModal">
        <FinalResults
          v-if="gameOver"
          :results="ds.roundHistory"
          :waiting-for-opponent="isWaitingForOpponentFinal"
          @close="handleClose"
        />
        <RoundResults
          v-else
          :waiting-for-opponent="isWaitingForOpponentAck"
          :has-acknowledged="hasMyRoundAck"
          :show-ack-controls="roundOver && !gameOver"
          @next="handleNext"
        />
      </ResultsModal>

      <!-- Opponent Disconnected Modal -->
      <OpponentDisconnectedModal
        :open="showDisconnectModal"
        :opponent-message="opponentPresence.message"
        :offline-duration="offlineDurationDisplay"
        :is-processing="isProcessingForfeit"
        @claim-victory="handleClaimVictory"
        @continue-waiting="handleContinueWaiting"
      />
    </div>
  </GameLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { type CompletionEvent } from '~/components/play-area/CollectionArea.vue'
import type { FinalSeenState, GameStatus, RoundAckState } from '~~/types/profile'
import { checkForWin } from '~/utils/yaku'
import { useCardStore } from '~~/stores/cardStore'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { type PlayerKey, usePlayerStore } from '~~/stores/playerStore'

const { t } = useI18n()
const pageTitle = computed(() => `${t('game.title')} | ${t('pages.home')}`)
const pageDescription = computed(() => t('pageDescriptions.home', { appName: t('game.title') }))

useSeoMeta({
  title: pageTitle.value,
  description: pageDescription.value,
  ogTitle: pageTitle.value,
  ogDescription: pageDescription.value,
  twitterTitle: pageTitle.value,
  twitterDescription: pageDescription.value,
})

const { isMobile } = useDevice()

const cs = useCardStore()
const ps = usePlayerStore()
const ds = useGameDataStore()

type SnapshotMetadata = {
  roundAcks?: RoundAckState | null
  finalSeen?: FinalSeenState | null
  terminalStatus?: GameStatus | null
}

const toPlain = <T,>(value: T | null | undefined): T | null =>
  value ? (JSON.parse(JSON.stringify(value)) as T) : null

const roundAcks = useState<RoundAckState | null>('round-acks', () => null)
const finalSeen = useState<FinalSeenState | null>('final-seen', () => ({ p1: false, p2: false }))
const terminalStatus = useState<GameStatus | null>('terminal-status', () => null)
const advancingRound = ref(false)
const finalCleanupDone = ref(false)

const { localKey, selfKey, opponentKey, isMultiplayerGame } = useLocalPlayerPerspective()
const { setOpponentPlayer } = useMultiplayerMatch()
const {
  subscribeToOpponentPresence,
  setMyStatus,
  cleanup: cleanupPresence,
  opponentPresence,
  isOpponentDisconnected,
  formatOfflineDuration,
} = usePresence()

const { handsEmpty } = storeToRefs(cs)
const { players, activePlayer } = storeToRefs(ps)
const { roundOver, gameOver, turnCounter, gameId } = storeToRefs(ds)

// Derived flag: whether the local player's hand should be interactive
const canInteractLocalHand = computed(() => {
  const current = ds.getCurrent
  const key = selfKey.value
  const can = current.player === key && current.phase === 'select'
  // Debug output to verify turn perspective on each client
  console.debug('[canInteractLocalHand]', {
    currentPlayer: current.player,
    phase: current.phase,
    selfKey: key,
    can,
  })
  return can
})

const buildRoundAckState = (round: number): RoundAckState => ({
  round,
  p1: false,
  p2: false,
})

const setLocalRoundAck = (round: number, playerKey: PlayerKey, value: boolean): RoundAckState => {
  const base =
    roundAcks.value && roundAcks.value.round === round
      ? { ...roundAcks.value }
      : buildRoundAckState(round)
  base[playerKey] = value
  roundAcks.value = base
  return base
}

const resetRoundAcks = () => {
  roundAcks.value = null
}

const ensureFinalSeenState = (): FinalSeenState => finalSeen.value ?? { p1: false, p2: false }

const markLocalFinalSeen = (playerKey: PlayerKey): FinalSeenState => {
  const next = { ...ensureFinalSeenState(), [playerKey]: true }
  finalSeen.value = next
  return next
}

const hasMyRoundAck = computed(() => {
  if (!roundAcks.value) return false
  if (roundAcks.value.round !== ds.roundCounter) return false
  return roundAcks.value[selfKey.value]
})

const hasOpponentRoundAck = computed(() => {
  if (!roundAcks.value) return false
  if (roundAcks.value.round !== ds.roundCounter) return false
  return roundAcks.value[opponentKey.value]
})

const isWaitingForOpponentAck = computed(
  () => hasMyRoundAck.value && !hasOpponentRoundAck.value && roundOver.value && !gameOver.value,
)

const hasLocalFinalSeen = computed(() => ensureFinalSeenState()[selfKey.value])
const hasOpponentFinalSeen = computed(() => ensureFinalSeenState()[opponentKey.value])
const isWaitingForOpponentFinal = computed(
  () => ds.gameOver && hasLocalFinalSeen.value && !hasOpponentFinalSeen.value,
)

const { useSelectedCard } = useCardHandler()
const selectedCard = useSelectedCard()

const { opponentPlay, useOpponent } = useAutoplay()
const autoOpponent: Ref<boolean> = useOpponent()

// Multiplayer turn sync helpers
const {
  saveMultiplayerGame,
  syncMultiplayerGame,
  loadMultiplayerGame,
  initializeSync,
  deleteSavedGame,
  getSaveKeyForMode,
  forfeitMultiplayerGame,
} = useStoreManager()
const { subscribeToGame } = useMultiplayerMatch()
const gameUnsubscribe = ref<(() => void) | null>(null)

const showModal = ref(false)
const showLoader = ref(false)
const showDisconnectModal = ref(false)
const isProcessingForfeit = ref(false)

// Grace period before showing disconnect modal (30 seconds)
const DISCONNECT_GRACE_PERIOD_MS = 30 * 1000
const disconnectGraceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Computed offline duration for the modal
const offlineDurationDisplay = computed(() => formatOfflineDuration() || '0s')
const gameStart = useState('start')

const {
  decisionIsPending,
  makeDecision,
  callStop,
  koikoiIsCalled,
  stopIsCalled,
  cleanup,
  getCaller,
} = useDecisionHandler()

const handleDecision = async () => await makeDecision()

const shoutTimeout = ref<NodeJS.Timeout | null>(null)

// Initialize stats tracking (automatically watches for round completion)
useStatsTracking()

const { $clientPosthog } = useNuxtApp()

const handleCompletion = (data: CompletionEvent) => {
  const { player, score, completedYaku } = data
  if (player) {
    // The round did NOT end in a draw
    const message = `${player.toUpperCase()} *** Completed ${completedYaku
      .map((s) => s.name.toUpperCase())
      .join(' + ')}!`
    consoleLogColor(message, 'skyblue')
  }
  consoleLogColor('\tScore: ' + score, 'lightblue')
  ds.saveResult({
    winner: player,
    score: score * ps.bonusMultiplier,
    completedYaku,
  })

  // Single-player: always enter decision flow (human vs CPU).
  if (!isMultiplayerGame.value) {
    handleDecision()
    return
  }

  // Multiplayer: only the player who completed the yaku (from this client's perspective)
  // should enter the decision flow. Opponent clients see the results but never
  // enter a pending decision state, so their modal does not reopen.
  if (selfKey.value === player) {
    handleDecision()
  }
}

const handleStop = async () => {
  const player = activePlayer.value.id
  console.debug(player.toUpperCase(), '>>> Called STOP')
  ds.endRound()
  // Stats are automatically tracked by useStatsTracking composable
  const ackSeed = buildRoundAckState(ds.roundCounter)
  roundAcks.value = ackSeed
  const finalSeed = ds.gameOver ? ensureFinalSeenState() : (finalSeen.value ?? null)
  if (ds.gameOver) {
    finalSeen.value = finalSeed ?? { p1: false, p2: false }
    terminalStatus.value = 'completed'
  }
  await pushMultiplayerSnapshot('round-end', undefined, {
    roundAcks: ackSeed,
    finalSeen: finalSeed,
    terminalStatus: ds.gameOver ? 'completed' : null,
  })
}

const handleKoikoi = () => {
  console.debug('>>> Called KOI-KOI')
  ps.incrementBonus()
  showModal.value = false
  shoutTimeout.value = setTimeout(() => {
    shoutTimeout.value = null
  }, 2000)
}

// Closing the round results modal
const advanceToNextRound = async () => {
  if (advancingRound.value || gameOver.value) {
    showLoader.value = false
    return
  }
  advancingRound.value = true
  showLoader.value = true
  resetRoundAcks()
  finalSeen.value = null
  terminalStatus.value = null
  ds.nextRound()
  showModal.value = false
  await sleep(2000)
  await startRound()

  // In multiplayer, push a fresh snapshot immediately after starting the new round
  // so the opponent sees the new round state before the first turn completes.
  await pushMultiplayerSnapshot('new-round', undefined, {
    roundAcks: null,
    finalSeen: null,
    terminalStatus: null,
  })
  advancingRound.value = false
}

const handleNext = async () => {
  const ack = setLocalRoundAck(ds.roundCounter, selfKey.value, true)
  await pushMultiplayerSnapshot('round-ack', undefined, { roundAcks: toPlain(ack) })

  if (ack.p1 && ack.p2) {
    await advanceToNextRound()
  } else {
    showLoader.value = false
  }
}

const performFinalCleanup = async () => {
  if (finalCleanupDone.value) return
  finalCleanupDone.value = true
  $clientPosthog?.capture('game_ended')
  ds.nextRound() // This should fix the issue of not swapping to the winner after final round
  showModal.value = false

  // When a multiplayer match is fully completed, clear the multiplayer save
  // so "Resume Match" no longer appears on the start screen.
  if (isMultiplayerGame.value) {
    try {
      const multiplayerKey = getSaveKeyForMode('multiplayer')
      const success = await deleteSavedGame(multiplayerKey)
      if (success) {
        console.info('Deleted multiplayer save after match completion', multiplayerKey)
      }
    } catch (error) {
      console.error('Failed to delete multiplayer save after match completion:', error)
    }
  }

  resetAllStores()
  // Return to the start screen
  gameStart.value = false
}

// Closing the final results modal
const handleClose = async () => {
  finalSeen.value = markLocalFinalSeen(selfKey.value)
  terminalStatus.value = 'completed'

  await pushMultiplayerSnapshot('final-seen', undefined, {
    finalSeen: finalSeen.value,
    terminalStatus: 'completed',
  })

  if (finalSeen.value?.p1 && finalSeen.value?.p2) {
    await performFinalCleanup()
  } else {
    showModal.value = true
  }
}

// Handle claiming victory when opponent disconnects
const handleClaimVictory = async () => {
  if (!isMultiplayerGame.value || isProcessingForfeit.value) return

  const multiplayerMeta = useState<{
    isNew: boolean
    gameId: string
    p1: string
    p2: string
    activePlayerUid: string
  }>('multiplayer-game-meta')

  const opponentUid = opponentPresence.value.uid
  if (!opponentUid || !multiplayerMeta.value?.gameId) {
    console.error('Cannot claim victory: missing opponent UID or game ID')
    return
  }

  isProcessingForfeit.value = true

  try {
    const success = await forfeitMultiplayerGame(
      multiplayerMeta.value.gameId,
      opponentUid,
      'network_disconnect',
    )

    if (success) {
      console.info('Victory claimed due to opponent disconnect')
      showDisconnectModal.value = false

      // Set game as over and show final results
      // The forfeited opponent gets 0 points, winner gets their current score
      ds.endRound()
      ds.gameOver = true
      terminalStatus.value = 'abandoned'

      // Show final results modal
      showModal.value = true
    } else {
      console.error('Failed to claim victory')
    }
  } catch (error) {
    console.error('Error claiming victory:', error)
  } finally {
    isProcessingForfeit.value = false
  }
}

// Handle continuing to wait for opponent
const handleContinueWaiting = () => {
  showDisconnectModal.value = false
}

// Clear disconnect grace timer
const clearDisconnectGraceTimer = () => {
  if (disconnectGraceTimer.value) {
    clearTimeout(disconnectGraceTimer.value)
    disconnectGraceTimer.value = null
  }
}

// Reset all stores to initial state
const resetAllStores = () => {
  console.debug('Resetting all stores to initial state...')
  ds.reset() // Reset game data store
  ps.reset() // Reset player store to initial state (p1 active and dealer)
  cs.reset() // Reset card store
  roundAcks.value = null
  finalSeen.value = null
  terminalStatus.value = null
  finalCleanupDone.value = false
}

/**
 * Push a multiplayer snapshot to Firestore reflecting the current local state.
 * Used after key transitions: turn hand-off, new round start, and round end.
 */
const pushMultiplayerSnapshot = async (
  context: string,
  activeKeyOverride?: PlayerKey,
  metadata?: SnapshotMetadata,
) => {
  if (!isMultiplayerGame.value) return

  const multiplayerMeta = useState<{
    isNew: boolean
    gameId: string
    p1: string
    p2: string
    activePlayerUid: string
  }>('multiplayer-game-meta', () => ({
    isNew: false,
    gameId: '',
    p1: '',
    p2: '',
    activePlayerUid: '',
  }))

  const { current: currentProfile } = useProfile()
  if (!currentProfile.value || !multiplayerMeta.value.gameId) return

  const p1 = multiplayerMeta.value.p1
  const p2 = multiplayerMeta.value.p2
  const activeKey = activeKeyOverride ?? (activePlayer.value.id as PlayerKey)
  const activeUid = activeKey === 'p1' ? p1 : p2

  // Only participants should push
  if (currentProfile.value.uid !== p1 && currentProfile.value.uid !== p2) return

  const mergedMetadata: SnapshotMetadata = {
    roundAcks: metadata?.roundAcks ?? roundAcks.value ?? null,
    finalSeen: metadata?.finalSeen ?? finalSeen.value ?? null,
    terminalStatus: metadata?.terminalStatus ?? terminalStatus.value ?? null,
  }

  const plainMetadata: SnapshotMetadata = {
    roundAcks: toPlain(mergedMetadata.roundAcks),
    finalSeen: toPlain(mergedMetadata.finalSeen),
    terminalStatus: mergedMetadata.terminalStatus ?? null,
  }

  try {
    await saveMultiplayerGame(p1, p2, activeUid, plainMetadata)
    console.info(`Multiplayer snapshot saved (${context})`, {
      gameId: multiplayerMeta.value.gameId,
      p1,
      p2,
      activePlayerUid: activeUid,
      roundAcks: plainMetadata.roundAcks,
      finalSeen: plainMetadata.finalSeen,
      terminalStatus: plainMetadata.terminalStatus,
    })
  } catch (error) {
    console.error(`Failed to save multiplayer snapshot (${context}):`, error)
  }
}

// Specialized initialization for a brand new multiplayer game
const initializeNewMultiplayerGame = async () => {
  const { current: currentProfile } = useProfile()

  const multiplayerMeta = useState<{
    isNew: boolean
    gameId: string
    p1: string
    p2: string
    activePlayerUid: string
  }>('multiplayer-game-meta', () => ({
    isNew: false,
    gameId: '',
    p1: '',
    p2: '',
    activePlayerUid: '',
  }))

  if (!multiplayerMeta.value.isNew || !multiplayerMeta.value.gameId) {
    console.warn('initializeNewMultiplayerGame called without multiplayer meta; falling back')
    resetAllStores()
    startRound()
    return
  }

  const currentUid = currentProfile.value?.uid
  const isStarter = currentUid && currentUid === multiplayerMeta.value.activePlayerUid

  // Ensure the game data store uses the canonical multiplayer gameId from Firestore
  // so both players share the same identifier and push to the same multiplayer_games
  // document. Without this, the starting player could generate a new local gameId and
  // push snapshots to a different document, leaving the original host document in a
  // pre-game state.
  if (multiplayerMeta.value.gameId && gameId.value !== multiplayerMeta.value.gameId) {
    console.debug('[initializeNewMultiplayerGame] Syncing local gameId to multiplayer meta', {
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

  roundAcks.value = null
  finalSeen.value = null
  terminalStatus.value = null
  finalCleanupDone.value = false

  // Ensure sync adapters are ready
  initializeSync()

  if (isStarter) {
    console.info('Initializing new multiplayer game as starting player', multiplayerMeta.value)

    // Start with a clean state and run normal round initialization
    resetAllStores()
    // Ensure the correct starting players is reflected in state
    ps.reset(localKey.value)

    await startRound()

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

      const loaded = await loadMultiplayerGame()
      if (!loaded) {
        console.warn('Failed to load multiplayer game state after sync retries')
      }
      console.log('NON-STARTER INITIALIZED', Date.now())
    } catch (error) {
      console.error('Failed to sync/load multiplayer game for non-starting player:', error)
    }
  }

  // Mark meta as no longer "new" so subsequent starts use regular resume/new logic
  multiplayerMeta.value.isNew = false

  // Subscribe to game document to receive remote updates (turns, new rounds, etc.)
  if (gameUnsubscribe.value) {
    gameUnsubscribe.value()
  }

  gameUnsubscribe.value = subscribeToGame(multiplayerMeta.value.gameId, async (game) => {
    const uid = currentProfile.value?.uid
    if (!uid) return

    try {
      // Always pull the latest remote state on any multiplayer_games change.
      // This avoids subtle timestamp-based no-op cases in syncMultiplayerGame
      // and guarantees that both players see round/match transitions.
      await syncMultiplayerGame(game.gameId)
      const loaded = await loadMultiplayerGame()
      if (!loaded) {
        console.warn('Failed to load multiplayer game state after remote update')
      }
      roundAcks.value = game.roundAcks ?? roundAcks.value ?? null
      finalSeen.value = game.finalSeen ?? finalSeen.value ?? { p1: false, p2: false }
      terminalStatus.value = game.terminalStatus ?? terminalStatus.value ?? null

      // If the updated state indicates the match is over, ensure this client
      // also shows the final results modal, even if they were not the
      // active player on the last turn.
      if (ds.gameOver) {
        if (!finalSeen.value) {
          finalSeen.value = ensureFinalSeenState()
        }
        if (!showModal.value) {
          showModal.value = true
        }
      }
    } catch (error) {
      console.error('Failed to sync multiplayer turn from Firestore:', error)
    }
  })

  // Subscribe to opponent's presence
  const opponentUid = multiplayerMeta.value[opponentKey.value]
  if (opponentUid) {
    subscribeToOpponentPresence(opponentUid)
    console.info(`[Multiplayer] Subscribed to opponent presence: ${opponentUid}`)
  }
}

const startRound = async () => {
  // FIX: Opponent played twice on starting new round
  showLoader.value = false
  autoOpponent.value = true
  ds.startRound()
  const result = checkDeal()

  // Round is reset
  if (result === undefined) return
  // Round is over
  if (result) {
    handleInstantWin(result as CompletionEvent)
    return
  }
  // In single-player, let the CPU opponent take the first turn when p2 starts.
  if (!isMultiplayerGame.value && autoOpponent.value && ps.players.p2.isActive) {
    opponentPlay({ speed: 2 })
  }
}

const handleInstantWin = (result: CompletionEvent) => {
  handleCompletion(result)
  showModal.value = true
  callStop()
  ds.endRound()
  // Stats are automatically tracked by useStatsTracking composable
  const ackSeed = buildRoundAckState(ds.roundCounter)
  roundAcks.value = ackSeed
  const finalSeed = ds.gameOver ? ensureFinalSeenState() : (finalSeen.value ?? null)
  if (ds.gameOver) {
    finalSeen.value = finalSeed ?? { p1: false, p2: false }
    terminalStatus.value = 'completed'
  }
  void pushMultiplayerSnapshot('instant-win-round-end', undefined, {
    roundAcks: ackSeed,
    finalSeen: finalSeed,
    terminalStatus: ds.gameOver ? 'completed' : null,
  })
}

const checkDeal = () => {
  // Check the field and each hand for a 4-pair or 4-of-a-kind
  const hands = [
    { name: 'field', cards: cs.field },
    { name: ps.activePlayer.id, cards: cs.hand[ps.activePlayer.id] },
    { name: ps.inactivePlayer.id, cards: cs.hand[ps.inactivePlayer.id] },
  ]
  // If no condition exists, null will be returned
  var result = null
  for (const hand of hands) {
    const completedYaku = checkForWin(hand.cards)
    if (completedYaku) {
      result = {
        player: hand.name,
        score: completedYaku.points,
        completedYaku: [completedYaku],
      }
      // Game round is reset if win condition exists on the field
      if (result?.player === 'field') {
        console.debug(`Revealed ${result.completedYaku[0]?.name.toUpperCase()}. Resetting...`)
        cs.reset()
        startRound()
        return
      }
      // Add cards from the winner's hand to their collection for display in the results modal
      cs.stageForCollection(result.completedYaku[0]?.cards ?? [])
      cs.collectCards(hand.name as PlayerKey)
      break
    }
  }
  return result
}

onBeforeUnmount(() => {
  // Clean up multiplayer listener
  if (gameUnsubscribe.value) {
    gameUnsubscribe.value()
    gameUnsubscribe.value = null
  }

  // Clean up disconnect grace timer
  clearDisconnectGraceTimer()

  cleanupPresence()

  // Reset the game state if the user navigates away from the page
  ds.endRound()
  ds.nextRound()
  handleClose()
  if (shoutTimeout.value) clearTimeout(shoutTimeout.value)
  cleanup()
})

onMounted(() => {
  // Apply card size multiplier from user settings
  // Default to smaller cards if mobile
  const { applyCardSizeMultiplier } = useCardDesign()
  applyCardSizeMultiplier(isMobile ? 0.8 : undefined)

  watch(decisionIsPending, () => {
    if (decisionIsPending.value) showModal.value = true
    if (koikoiIsCalled.value) handleKoikoi()
    if (stopIsCalled.value) handleStop()
  })

  watch(turnCounter, () => {
    // Handle an exhaustive draw condition
    if (turnCounter.value !== 9) return
    const drawConditions = [
      handsEmpty.value,
      ds.checkCurrentPhase('select'),
      !decisionIsPending.value,
      !stopIsCalled.value,
    ]
    if (drawConditions.every((cond) => cond === true)) {
      showModal.value = true
      // @ts-expect-error: CompletionEvent 'player' should not be null
      handleCompletion({ player: null, score: 0 })
      callStop()
      ds.endRound()
      // Stats are automatically tracked by useStatsTracking composable
    }
  })

  watch(roundOver, () => {
    // Ensure modal is closed when starting a new round during autoplay
    if (gameOver.value === true) return

    if (roundOver.value === false) {
      showModal.value = false
      return
    }

    // When a round has ended in multiplayer, make sure the non-calling player
    // also sees the round results modal. Their client will have roundOver = true
    // after syncing, but decisionIsPending will be false so RoundResults renders
    // in a read-only state (no KOI-KOI/STOP buttons).
    if (isMultiplayerGame.value && !decisionIsPending.value) {
      showModal.value = true
      if (roundAcks.value?.round !== ds.roundCounter) {
        roundAcks.value = buildRoundAckState(ds.roundCounter)
      }
    }
  })

  // When the match ends, ensure both players see the final results modal,
  // even if they were not the calling / active player on the last turn.
  watch(gameOver, () => {
    if (!gameOver.value) return
    finalSeen.value = ensureFinalSeenState()
    showModal.value = true
  })

  watch(
    roundAcks,
    async (acks) => {
      if (!acks) return
      if (acks.round !== ds.roundCounter) return
      if (acks.p1 && acks.p2 && roundOver.value && !gameOver.value) {
        await advanceToNextRound()
      }
    },
    { deep: true },
  )

  watch(
    finalSeen,
    async (state) => {
      if (finalCleanupDone.value) return
      if (state?.p1 && state?.p2 && gameOver.value) {
        await performFinalCleanup()
      }
    },
    { deep: true },
  )

  watch(
    activePlayer,
    async (newActive, oldActive) => {
      // Single-player CPU opponent
      if (!isMultiplayerGame.value && autoOpponent.value && ps.players.p2.isActive) {
        opponentPlay({ speed: 2 })
      }

      // Update presence status based on whose turn it is (multiplayer only)
      if (isMultiplayerGame.value && newActive) {
        if (newActive.id === selfKey.value) {
          // It's my turn - set status to 'playing'
          await setMyStatus('playing').catch((err) =>
            console.error('[Presence] Failed to set status to playing:', err),
          )
        } else if (oldActive && oldActive.id === selfKey.value) {
          // My turn just ended - set status back to 'online'
          await setMyStatus('online').catch((err) =>
            console.error('[Presence] Failed to set status to online:', err),
          )
        }
      }

      // In multiplayer, when our local turn ends (we were active and now opponent is active),
      // save a snapshot with the next active player.
      if (isMultiplayerGame.value && oldActive && newActive && newActive.id !== oldActive.id) {
        // Push a snapshot on any active-player change to avoid missing handoffs.
        await pushMultiplayerSnapshot('turn-change', newActive.id as PlayerKey)
      }
    },
    { flush: 'post' },
  )

  // Watch for opponent disconnection in multiplayer games
  watch(
    isOpponentDisconnected,
    (disconnected, wasDisconnected) => {
      // Only handle multiplayer games that are in progress
      if (!isMultiplayerGame.value || gameOver.value || !gameStart.value) {
        clearDisconnectGraceTimer()
        showDisconnectModal.value = false
        return
      }

      if (disconnected && !wasDisconnected) {
        // Opponent just went offline - start grace period
        console.info('[Presence] Opponent disconnected, starting grace period')
        clearDisconnectGraceTimer()
        disconnectGraceTimer.value = setTimeout(() => {
          // After grace period, show the disconnect modal
          if (isOpponentDisconnected.value && isMultiplayerGame.value && !gameOver.value) {
            console.info('[Presence] Grace period expired, showing disconnect modal')
            showDisconnectModal.value = true
          }
        }, DISCONNECT_GRACE_PERIOD_MS)
      } else if (!disconnected && wasDisconnected) {
        // Opponent came back online
        console.info('[Presence] Opponent reconnected')
        clearDisconnectGraceTimer()
        showDisconnectModal.value = false
      }
    },
    { immediate: true },
  )

  watch(gameStart, async () => {
    if (gameStart.value) {
      // Check if we're resuming from a saved game
      const resumeState = useState('resume-save', () => ({
        isResuming: false,
        saveKey: '',
        saveData: null as any,
        mode: 'single' as 'single' | 'multiplayer',
      }))

      if (resumeState.value.isResuming) {
        // Game state already loaded by StartScreen's loadGameFromStorage()
        // Just need to handle cleanup
        try {
          const { deleteSavedGame } = useStoreManager()

          // Clear the save only for single-player mode (anti-scumming)
          // Multiplayer saves persist until game is completed
          if (resumeState.value.saveKey && resumeState.value.mode === 'single') {
            console.info(`Deleting single-player save after resume: ${resumeState.value.saveKey}`)
            await deleteSavedGame(resumeState.value.saveKey)
            console.info('Single-player save deleted successfully')
          }
        } catch (error) {
          console.error('Error during save cleanup:', error)
        }

        // Clear the resume state
        resumeState.value = {
          isResuming: false,
          saveKey: '',
          saveData: null,
          mode: 'single',
        }

        showLoader.value = false
        autoOpponent.value = true
      } else if (resumeState.value.mode === 'multiplayer') {
        // Specialized initialization for a brand new multiplayer game
        console.debug('Starting new multiplayer game with specialized initialization')
        await initializeNewMultiplayerGame()
        showLoader.value = false
        autoOpponent.value = true
      } else {
        // Normal new game initialization (single-player)
        console.debug('Starting new single-player game - ensuring clean state...')
        isMultiplayerGame.value = false
        localKey.value = 'p1'
        resetAllStores() // Ensure clean state before starting
        startRound()
      }
    } else {
      console.debug('Resetting game...')
      if (!roundOver.value) ds.endRound()
      if (!gameOver.value) handleClose()
      // Additional cleanup - ensure stores are reset when returning to start screen
      resetAllStores()
    }
  })
})
</script>
