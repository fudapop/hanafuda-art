<template>
  <GameLayout>
    <div class="isolate">
      <div
        v-show="showLoader"
        class="fixed top-1/3 -translate-y-1/2 inset-x-0 mx-auto pointer-events-none z-1"
      >
        <template v-if="isMultiplayerGame">
          <SakuraLoader class="mx-auto opacity-80 w-max" />
          <p class="font-semibold tracking-wide text-center drop-shadow-md animate-pulse">
            {{ t('multiplayer.waiting_for_opponent') }}
          </p>
        </template>
        <CardsLoader v-else />
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
          @close="handleClose"
        />
        <RoundResults
          v-else
          :show-ack-controls="roundOver && !gameOver && (players[selfKey].isActive || isMultiplayerGame)"
          @next="handleNext"
        />
      </ResultsModal>

      <!-- Opponent Disconnected Modal -->
      <OpponentDisconnectedModal
        :open="showDisconnectModal"
        :opponent-message="opponentPresence.message"
        :is-processing="isProcessingForfeit"
        @cancel-game="handleCancelGame"
      />
    </div>
  </GameLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { type CompletionEvent } from '~/components/play-area/CollectionArea.vue'
import type { MultiplayerGame } from '~~/types/profile'
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

const advancingRound = ref(false)
const finalCleanupDone = ref(false)

const { localKey, selfKey, opponentKey, isMultiplayerGame } = useLocalPlayerPerspective()
const {
  setMyStatus,
  cleanup: cleanupPresence,
  opponentPresence,
  isOpponentDisconnected,
} = usePresence()

const { handsEmpty } = storeToRefs(cs)
const { players, activePlayer } = storeToRefs(ps)
const { roundOver, gameOver, turnCounter } = storeToRefs(ds)

// Derived flag: whether the local player's hand should be interactive
const canInteractLocalHand = computed(() => {
  if (isReplaying.value) return false
  const current = ds.getCurrent
  const key = selfKey.value
  const can = current.player === key && current.phase === 'select'
  // Debug output to verify turn perspective on each client
  return can
})

const { useSelectedCard, selectCardFromHand } = useCardHandler()
const selectedCard = useSelectedCard()

const { opponentPlay, useOpponent } = useAutoplay()
const autoOpponent: Ref<boolean> = useOpponent()

// Multiplayer orchestration
const {
  pushSnapshot: pushMultiplayerSnapshot,
  initGame: initMultiplayerGame,
  rejoinGame: rejoinMultiplayerGame,
  cleanupSubscription: cleanupMultiplayerSubscription,
  terminalStatus,
} = useMultiplayerOrchestrator()

const {
  syncMultiplayerGame,
  deserializeGameState,
  deleteSavedGame,
  getSaveKeyForMode,
  cancelMultiplayerGame,
} = useStoreManager()

// Opponent turn replay for multiplayer
const {
  isReplaying,
  shouldReplayTurn,
  replayOpponentTurn,
} = useOpponentReplay()

const showModal = ref(false)
const showLoader = ref(false)
const showDisconnectModal = ref(false)
const isProcessingForfeit = ref(false)

// Grace period before showing disconnect modal (30 seconds)
const DISCONNECT_GRACE_PERIOD_MS = 30 * 1000
const disconnectGraceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

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
  if (ds.gameOver) {
    terminalStatus.value = 'completed'
  }
  await pushMultiplayerSnapshot('round-end', undefined, {
    terminalStatus: ds.gameOver ? 'completed' : null,
  })
}

const handleKoikoi = () => {
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
  terminalStatus.value = null
  ds.nextRound()
  showModal.value = false
  await sleep(2000)
  await startRound()

  // In multiplayer, push a fresh snapshot immediately after starting the new round
  // so the opponent sees the new round state before the first turn completes.
  await pushMultiplayerSnapshot('new-round', undefined, {
    terminalStatus: null,
  })
  advancingRound.value = false
}

const handleNext = async () => {
  // In multiplayer, the non-active player just dismisses the modal locally.
  // The active player will advance the round and push the new-round snapshot.
  if (isMultiplayerGame.value && !players.value[selfKey.value].isActive) {
    showModal.value = false
    showLoader.value = true
    return
  }
  await advanceToNextRound()
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
  terminalStatus.value = 'completed'
  await pushMultiplayerSnapshot('final-close', undefined, {
    terminalStatus: 'completed',
  })
  await performFinalCleanup()
}

// Handle cancelling the game when opponent disconnects (no stats recorded)
const handleCancelGame = async () => {
  if (!isMultiplayerGame.value || isProcessingForfeit.value) return

  const multiplayerMeta = useState<{
    isNew: boolean
    gameId: string
    p1: string
    p2: string
    activePlayerUid: string
  }>('multiplayer-game-meta')

  if (!multiplayerMeta.value?.gameId) {
    console.error('Cannot cancel game: missing game ID')
    return
  }

  isProcessingForfeit.value = true

  try {
    const success = await cancelMultiplayerGame(
      multiplayerMeta.value.gameId,
      'opponent_disconnected',
    )

    if (success) {

      // Return to start screen — no stats, no results modal
      showDisconnectModal.value = false
      showModal.value = false
      resetAllStores()
      terminalStatus.value = 'cancelled'
      gameStart.value = false
    } else {
      console.error('Failed to cancel game')
    }
  } catch (error) {
    console.error('Error cancelling game:', error)
  } finally {
    isProcessingForfeit.value = false
  }
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
  ds.reset() // Reset game data store
  ps.reset() // Reset player store to initial state (p1 active and dealer)
  ps.setPlayerName('p1', 'Player 1')
  ps.setPlayerName('p2', 'Player 2')
  useState('multiplayer-opponent').value = null // Clear opponent from multiplayer
  cs.reset() // Reset card store
  terminalStatus.value = null
  finalCleanupDone.value = false
}

// Buffer for remote updates that arrive while a replay is in progress.
// The latest update wins — we only need the most recent authoritative state.
const pendingRemoteUpdate = ref<MultiplayerGame | null>(null)

const handleRemoteUpdate = async (game: MultiplayerGame) => {
  const { current: currentProfile } = useProfile()
  const uid = currentProfile.value?.uid
  if (!uid) return

  // If a replay is running, buffer this update and return.
  // The replay's finally block reconciles with its own state, and we'll
  // re-reconcile with the buffered (newer) state after it completes.
  if (isReplaying.value) {
    pendingRemoteUpdate.value = game
    return
  }

  try {
    // Set metadata FIRST before deserialization sets gameOver (which triggers watchers).
    terminalStatus.value = game.terminalStatus ?? terminalStatus.value ?? null

    const remoteState = game.gameState

    // Attempt step-by-step replay for opponent turns; fall through to direct sync otherwise.
    if (remoteState && shouldReplayTurn(remoteState)) {
      await replayOpponentTurn(remoteState, deserializeGameState)

      // Reconcile with any newer update that arrived during the replay
      if (pendingRemoteUpdate.value) {
        const pending = pendingRemoteUpdate.value
        pendingRemoteUpdate.value = null
        terminalStatus.value = pending.terminalStatus ?? terminalStatus.value ?? null
        if (pending.gameState) {
          await deserializeGameState(pending.gameState)
        }
      }

      // Show results modal after replay settles (watchers are suppressed during replay)
      if (ds.roundOver && !decisionIsPending.value) {
        showModal.value = true
      }
    } else {
      const synced = await syncMultiplayerGame(game.gameId)
      if (!synced) {
      }
    }

    // Update presence after replay/sync -- the activePlayer watcher is suppressed during replay
    if (isMultiplayerGame.value && !ds.gameOver && !ds.roundOver) {
      const isMyTurn = ps.activePlayer.id === selfKey.value
      await setMyStatus(isMyTurn ? 'playing' : 'online').catch((err) =>
        console.error('[Presence] Failed to update status after remote update:', err),
      )
    }

    // If the updated state indicates the match is over, ensure this client
    // also shows the final results modal.
    if (ds.gameOver) {
      if (!showModal.value) {
        showModal.value = true
      }
    }
  } catch (error) {
    console.error('Failed to sync multiplayer turn from Firestore:', error)
  }
}

// Initialize a new multiplayer game via the orchestrator
const initializeNewMultiplayerGame = async () => {
  finalCleanupDone.value = false

  await initMultiplayerGame(
    { resetAllStores, startRound },
    handleRemoteUpdate,
  )
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
  if (ds.gameOver) {
    terminalStatus.value = 'completed'
  }
  void pushMultiplayerSnapshot('instant-win-round-end', undefined, {
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
  cleanupMultiplayerSubscription()

  // Clean up disconnect grace timer
  clearDisconnectGraceTimer()

  cleanupPresence()

  // Reset the game state if the user navigates away from the page
  ds.endRound()
  ds.nextRound()

  // Only run final-close for single-player; multiplayer leave is handled separately
  if (!isMultiplayerGame.value) {
    handleClose()
  }

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

  // Trigger shout animation during opponent replay (callKoikoiFor sets
  // decision to 'koikoi' directly, bypassing the decisionIsPending watcher)
  watch(koikoiIsCalled, (called) => {
    if (called && isReplaying.value) {
      shoutTimeout.value = setTimeout(() => {
        shoutTimeout.value = null
      }, 2000)
    }
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
      showLoader.value = false
      return
    }

    // When a round has ended in multiplayer, make sure the non-calling player
    // also sees the round results modal. Their client will have roundOver = true
    // after syncing, but decisionIsPending will be false so RoundResults renders
    // in a read-only state (no KOI-KOI/STOP buttons).
    if (isMultiplayerGame.value && !decisionIsPending.value) {
      if (isReplaying.value) return // Suppressed; handled after replay settles
      showModal.value = true
    }
  })

  // When the match ends, ensure both players see the final results modal,
  // even if they were not the calling / active player on the last turn.
  watch(gameOver, () => {
    if (!gameOver.value) return
    if (isReplaying.value) return // Suppressed; handled in handleRemoteUpdate
    showModal.value = true
  })

  watch(
    activePlayer,
    async (newActive, oldActive) => {
      // Suppress all side-effects during opponent turn replay
      if (isReplaying.value) return

      // Auto-select first card in hand at turn start for the local player
      if (newActive?.id === selfKey.value && ds.checkCurrentPhase('select')) {
        const hand = cs.hand[selfKey.value]
        if (hand.size > 0) {
          const firstCard = [...hand][0]
          if (firstCard) selectCardFromHand(firstCard)
        }
      }

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
        clearDisconnectGraceTimer()

        // If opponent left intentionally with a message, show modal immediately
        if (opponentPresence.value?.message) {
          showDisconnectModal.value = true
        } else {
          // Network drop — start grace period
          disconnectGraceTimer.value = setTimeout(() => {
            if (isOpponentDisconnected.value && isMultiplayerGame.value && !gameOver.value) {
              showDisconnectModal.value = true
            }
          }, DISCONNECT_GRACE_PERIOD_MS)
        }
      } else if (!disconnected && wasDisconnected) {
        // Opponent came back online
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

      if (resumeState.value.isResuming && resumeState.value.mode === 'multiplayer') {
        // Multiplayer resume — rejoin the live session via orchestrator
        try {
          await rejoinMultiplayerGame(handleRemoteUpdate)
        } catch (error) {
          console.error('Error during multiplayer rejoin:', error)
        } finally {
          resumeState.value = {
            isResuming: false,
            saveKey: '',
            saveData: null,
            mode: 'single',
          }
          showLoader.value = false
          autoOpponent.value = true
        }
      } else if (resumeState.value.isResuming) {
        // Single-player resume — game state already loaded by StartScreen
        try {
          const { deleteSavedGame } = useStoreManager()

          // Clear the save for single-player mode (anti-scumming)
          if (resumeState.value.saveKey) {
            await deleteSavedGame(resumeState.value.saveKey)
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
        await initializeNewMultiplayerGame()
        showLoader.value = false
        autoOpponent.value = true
      } else {
        // Normal new game initialization (single-player)
        isMultiplayerGame.value = false
        localKey.value = 'p1'
        resetAllStores() // Ensure clean state before starting
        startRound()
      }
    } else {

      if (isMultiplayerGame.value) {
        // Multiplayer leave: the game was already saved by handleMultiplayerLeave.
        // Just clean up local subscriptions and state without touching Firestore
        // or deleting the IDB save (so the player can resume later).
        cleanupMultiplayerSubscription()
        isMultiplayerGame.value = false
        localKey.value = 'p1'
        resetAllStores()
      } else {
        if (!roundOver.value) ds.endRound()
        if (!gameOver.value) handleClose()
        resetAllStores()
      }
    }
  })
})
</script>
