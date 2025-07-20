<template>
  <GameLayout>
    <div class="isolate">
      <div
        v-show="showLoader"
        class="fixed top-1/3 -translate-y-1/2 inset-x-0 mx-auto pointer-events-none z-[1]"
      >
        <CardsLoader />
      </div>

      <!-- OPPONENT HAND -->
      <div class="absolute inset-x-0 top-0 h-28">
        <LazyOpponentArea />
      </div>

      <!-- OPPONENT COLLECTION -->
      <div
        :class="[
          'absolute inset-x-0 -translate-y-3/4 top-1/4',
          // 'lg:inset-x-auto lg:right-0'
        ]"
      >
        <div class="w-screen max-w-3xl mx-auto overflow-x-auto touch-pan-x no-scrollbar">
          <LazyCollectionArea
            player="p2"
            @completed="handleCompletion"
          />
        </div>
      </div>

      <!-- FIELD -->
      <div :class="['absolute inset-x-0 max-w-2xl top-1/4 w-max mx-auto isolate -z-10']">
        <div class="w-screen overflow-x-auto touch-pan-x no-scrollbar">
          <div
            v-click-disabled:unless="players.p1.isActive && !!selectedCard"
            :class="[
              'grid grid-cols-[80px_1fr] gap-2',
              'py-8 px-4 sm:px-8 lg:px-12',
              'transition-transform duration-200 origin-left scale-75 sm:scale-100',
            ]"
          >
            <LazyDeck />
            <LazyFieldDisplay />
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
          <LazyCollectionArea
            player="p1"
            @completed="handleCompletion"
          />
        </div>
      </div>

      <!-- PLAYER HAND -->
      <div
        :class="[
          'absolute -bottom-4 inset-x-0 pb-8',
          'transition-all duration-200 origin-left [&_ul]:scale-90 [&_ul]:sm:scale-100',
          players.p2.isActive && 'opacity-80',
          isMobile && 'landscape:translate-y-8',
        ]"
      >
        <div
          class="w-screen max-w-full px-8 py-8 mx-auto overflow-x-auto overflow-y-visible no-scrollbar touch-pan-x"
        >
          <div v-click-disabled:unless="players.p1.isActive && ds.checkCurrentPhase('select')">
            <LazyHandDisplay id="p1" />
          </div>
        </div>
      </div>

      <LazyResultsModal :show="showModal">
        <LazyFinalResults
          v-if="gameOver"
          :results="ds.roundHistory"
          @close="handleClose"
        />
        <LazyRoundResults
          v-else
          @next="handleNext"
        />
      </LazyResultsModal>
    </div>
  </GameLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { POSITION, useToast } from 'vue-toastification'
import { type CompletionEvent } from '~/components/play-area/CollectionArea.vue'
import { useCardStore } from '~/stores/cardStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { type PlayerKey, usePlayerStore } from '~/stores/playerStore'
import { checkForWin } from '~/utils/yaku'

definePageMeta({
  requiresAuth: true,
  middleware: ['auth'],
})

const { isMobile } = useDevice()
const { t } = useI18n()

const cs = useCardStore()
const ps = usePlayerStore()
const ds = useGameDataStore()
const { handsEmpty } = storeToRefs(cs)
const { players, activePlayer } = storeToRefs(ps)
const { roundOver, gameOver, turnCounter } = storeToRefs(ds)

const { useSelectedCard } = useCardHandler()
const selectedCard = useSelectedCard()
const { applyCardSizeMultiplier } = useCardDesign()

const { opponentPlay, useOpponent } = useAutoplay()
const autoOpponent: Ref<boolean> = useOpponent()

const showModal = ref(false)
const showLoader = ref(false)
const gameStart = useState('start')
const gameTest = useState('test')

const toast = useToast()

const { decisionIsPending, makeDecision, callStop, koikoiIsCalled, stopIsCalled, cleanup } =
  useDecisionHandler()

const handleDecision = async () => await makeDecision()

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
  handleDecision()
}

const handleStop = () => {
  const player = activePlayer.value.id
  console.debug(player.toUpperCase(), '>>> Called STOP')
  ds.endRound()
  const result = ds.getCurrent.result
  console.log({
    WINNER: result.winner?.toUpperCase(),
    SCORE: result.score,
    // @ts-expect-error
    COMPLETED: result.completedYaku.map((yaku) => yaku.name).join(', '),
  })
}

const handleKoikoi = () => {
  console.debug('>>> Called KOI-KOI')
  ps.incrementBonus()
  showModal.value = false
  toast(t('game.actions.koikoiWasCalled'), {
    timeout: 2000,
    position: POSITION.TOP_CENTER,
  })
}

// Closing the round results modal
const handleNext = async () => {
  showLoader.value = true
  ds.nextRound()
  showModal.value = false
  await sleep(2000)
  startRound()
}

// Closing the final results modal
const handleClose = () => {
  ds.nextRound() // This should fix the issue of not swapping to the winner after final round
  showModal.value = false
  ds.reset()
  // Return to the start screen
  gameStart.value = false
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
  if (ps.players.p2.isActive) opponentPlay({ speed: 2 })
}

const handleInstantWin = (result: CompletionEvent) => {
  handleCompletion(result)
  showModal.value = true
  callStop()
  handleStop()
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
        console.debug(`Revealed ${result.completedYaku[0].name.toUpperCase()}. Resetting...`)
        cs.reset()
        startRound()
        return
      }
      // Add cards from the winner's hand to their collection for display in the results modal
      cs.stageForCollection(result.completedYaku[0].cards)
      cs.collectCards(hand.name as PlayerKey)
      break
    }
  }
  return result
}

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
  }
})

watch(roundOver, () => {
  // Ensure modal is closed when starting a new round during autoplay
  if (gameOver.value === true) return
  if (roundOver.value === false) showModal.value = false
})

watch(activePlayer, () => {
  if (autoOpponent.value && ps.players.p2.isActive) {
    opponentPlay({ speed: 2 })
  }
})

watch(gameStart, () => {
  if (gameStart.value) {
    if (!gameTest.value) startRound()
  } else {
    console.debug('Resetting game...')
    if (!roundOver.value) ds.endRound()
    if (!gameOver.value) handleClose()
  }
})

onBeforeUnmount(() => {
  // Reset the game state if the user navigates away from the page
  ds.endRound()
  ds.nextRound()
  handleClose()
  cleanup()
  // Clear stored data
  // sessionStorage?.removeItem("new-hanafuda");
})

onMounted(() => {
  // Apply card size multiplier from user settings
  applyCardSizeMultiplier()
})
</script>
