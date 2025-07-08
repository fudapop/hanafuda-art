<template>
  <GameLayout>
    <div class="isolate">
      <div
        v-show="showLoader"
        class="fixed top-1/3 -translate-y-1/2 inset-x-0 mx-auto pointer-events-none z-[1]"
      >
        <CardsLoader />
      </div>
      <!-- <CircularLoader :show="showLoader"> Starting the next round... </CircularLoader> -->
      <!-- OPPONENT HAND -->
      <div class="absolute inset-x-0 top-0 h-28">
        <LazyOpponentArea />
      </div>

      <!-- OPPONENT COLLECTION -->
      <div class="absolute inset-x-0 -translate-y-1/2 top-1/4 lg:inset-x-auto lg:right-0">
        <LazyCollectionArea
          player="p2"
          @completed="handleCompletion"
        />
      </div>

      <!-- FIELD -->
      <div class="absolute inset-x-0 max-w-5xl -translate-y-3/4 top-1/2">
        <div
          v-click-disabled:unless="players.p1.isActive && !!selectedCard"
          class="max-sm:[--card-height:85px] max-lg:[--card-height:100px] place-content-center grid grid-cols-[80px_1fr] sm:grid-cols-[160px_1fr] sm:translate-y-4 origin-left sm:origin-center"
        >
          <LazyDeck />
          <!-- <LazyListGrid :cols="6" :rows="2" flow="column" gap="4px"> -->
          <LazyFieldDisplay />
          <!-- </LazyListGrid> -->
        </div>
      </div>

      <!-- PLAYER COLLECTION -->
      <!-- ARTIST CREDIT -->
      <!-- <a
          v-if="getDesignInfo().creator"
          class="absolute right-4 text-xs italic underline opacity-40 !pointer-events-auto -top-8 underline-offset-4 whitespace-nowrap dark:text-white"
          :title="getDesignInfo().urlDescription"
          :href="getDesignInfo().url"
          target="_blank"
        >
          Card designs by {{ getDesignInfo().creator }} &rarr;
        </a> -->
      <div class="absolute inset-x-0 -translate-y-full lg:inset-x-auto lg:right-0 top-3/4">
        <LazyCollectionArea
          player="p1"
          @completed="handleCompletion"
        />
      </div>

      <!-- PLAYER HAND -->
      <div
        v-click-disabled:unless="players.p1.isActive && ds.checkCurrentPhase('select')"
        :class="{
          'transition-all duration-200 absolute bottom-1/4 inset-x-0 pb-8': true,
          'opacity-80 sm:translate-y-1/2': players.p2.isActive,
        }"
      >
        <LazyHandDisplay id="p1" />
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

      <!-- DEV BUTTONS -->
      <!-- <div
      v-if="gameTest"
      v-hide="showLoader"
      class="absolute inset-y-0 z-10 flex flex-col gap-1 my-auto right-4 w-max h-max"
    >
      <button
        v-show="cs.deck.size === 48"
        type="button"
        class="rounded-md bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        @click="startAuto"
      >
        Autoplay
      </button>
      <button
        v-show="!roundOver"
        type="button"
        class="rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        @click="stopAuto"
      >
        Stop test
      </button>
    </div> -->
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
  title: 'New Hanafuda | Play Hanafuda Koi-Koi',
})

const cs = useCardStore()
const ps = usePlayerStore()
const ds = useGameDataStore()
const { handsEmpty } = storeToRefs(cs)
const { players, activePlayer } = storeToRefs(ps)
const { roundOver, gameOver, turnCounter } = storeToRefs(ds)

const { useSelectedCard } = useCardHandler()
const selectedCard = useSelectedCard()
const { getDesignInfo, applyCardSizeMultiplier } = useCardDesign()

const { autoPlay, opponentPlay, useOpponent } = useAutoplay()
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
  toast('Koi-koi was called!', {
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

// const startAuto = async () => {
//   autoOpponent.value = false;
//   roundOver.value = false;
//   // Instant win conditions are not checked during autoplay
//   autoPlay({ speed: 3, rounds: Infinity });
// };

// const stopAuto = async () => {
//   console.log("Stopping autoplay...");
//   roundOver.value = true;
//   gameOver.value = true;
//   ds.reset();
// };

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
        console.log(`Revealed ${result.completedYaku[0].name.toUpperCase()}. Resetting...`)
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
    console.info('Resetting game...')
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
