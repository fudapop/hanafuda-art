<template>
  <GameLayout>
    <div
      v-show="showLoader"
      class="fixed top-1/3 -translate-y-1/2 inset-x-0 mx-auto pointer-events-none z-[1]"
    >
      <CardsLoader />
    </div>
    <!-- <CircularLoader :show="showLoader"> Starting the next round... </CircularLoader> -->
    <div
      class="z-10 grid grid-rows-[--table-grid-rows] w-full min-w-[320px] max-w-[1200px] h-full min-h-[500px] mx-auto"
    >
      <!-- OPPONENT HAND -->
      <LazyOpponentArea />

      <!-- OPPONENT COLLECTION -->
      <div class="-translate-y-8 pointer-events-none -z-10">
        <LazyCollectionArea player="p2" @completed="(data) => handleCompletion(data)" />
      </div>

      <!-- FIELD -->
      <div
        v-click-disabled:unless="players.p1.isActive && !!selectedCard"
        class="max-md:[--card-height:80px] place-content-center grid grid-cols-[80px_1fr]"
      >
        <LazyDeck />
        <LazyListGrid :cols="6" :rows="2" flow="column" gap="4px">
          <LazyCardList :cards="field" />
        </LazyListGrid>
      </div>

      <!-- PLAYER COLLECTION -->
      <div class="h-full pointer-events-none -z-10">
        <LazyCollectionArea player="p1" @completed="(data) => handleCompletion(data)" />
      </div>

      <!-- PLAYER HAND -->
      <div
        v-click-disabled:unless="players.p1.isActive && ds.checkCurrentPhase('select')"
        class="max-sm:[--card-height:85px] max-lg:[--card-height:90px] min-[400px]:mx-auto w-max grid translate-y-6"
      >
        <div
          :class="{
            'transition-opacity duration-200': true,
            'opacity-50': players.p2.isActive,
          }"
        >
          <LazyListGrid :cols="8" :rows="'auto'" flow="row" gap="4px">
            <LazyCardList :cards="hand.p1" :stack="true" />
          </LazyListGrid>
        </div>
      </div>
    </div>

    <LazyResultsModal :show="showModal">
      <LazyFinalResults v-if="gameOver" :results="ds.roundHistory" @close="handleClose" />
      <LazyRoundResults v-else @next="handleNext" />
    </LazyResultsModal>

    <!-- DEV BUTTONS -->
    <div
      v-if="deck.size === 48 || roundOver"
      v-hide="showLoader"
      class="absolute inset-y-0 z-10 flex flex-col gap-1 my-auto right-4 w-max h-max"
    >
      <button
        v-if="deck.size === 48"
        type="button"
        class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        @click="startRound"
      >
        Deal Cards
      </button>
      <button
        v-if="nodeEnv === 'development'"
        v-show="deck.size === 48"
        type="button"
        class="rounded-md bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        @click="startAuto"
      >
        Autoplay
      </button>
    </div>
  </GameLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useGameDataStore } from "~/stores/gameDataStore";
import { PlayerKey, usePlayerStore } from "~/stores/playerStore";
import { useCardStore } from "~/stores/cardStore";
import { CompletionEvent } from "~/components/CollectionArea.vue";
import { checkForWin } from "~/utils/yaku";

definePageMeta({
  requiresAuth: true,
  middleware: ["auth"],
});

const { nodeEnv } = useRuntimeConfig().public;

const cs = useCardStore();
const ps = usePlayerStore();
const ds = useGameDataStore();
const { hand, field, deck, handsEmpty } = storeToRefs(cs);
const { players, activePlayer } = storeToRefs(ps);
const { roundOver, gameOver, turnCounter } = storeToRefs(ds);

const { useSelectedCard } = useCardHandler();
const selectedCard = useSelectedCard();

const { autoPlay, opponentPlay, useOpponent } = useAutoplay();
const autoOpponent: Ref<boolean> = useOpponent();

const showModal = ref(false);
const showLoader = ref(false);
const gameStart = useState("start");

const {
  decisionIsPending,
  makeDecision,
  callStop,
  koikoiIsCalled,
  stopIsCalled,
} = useDecisionHandler();

const handleCompletion = (data: CompletionEvent) => {
  const { player, score, completedYaku } = data;
  if (player) {
    // The round did NOT end in a draw
    const message = `${player.toUpperCase()} *** Completed ${completedYaku
      .map((s) => s.name.toUpperCase())
      .join(" + ")}!`;
    consoleLogColor(message, "skyblue");
  }
  consoleLogColor("\tScore: " + score, "lightblue");
  console.log(
    ds.saveResult({
      winner: player,
      score: score * ps.bonusMultiplier,
      completedYaku,
    })
  );
  handleDecision();
};

const handleDecision = async () => await makeDecision();

const handleStop = () => {
  const player = activePlayer.value.id;
  console.debug(player.toUpperCase(), ">>> Called STOP");
  ds.endRound();
  const result = ds.getCurrent.result;
  console.log({
    WINNER: result.winner?.toUpperCase(),
    SCORE: result.score,
    // @ts-expect-error
    COMPLETED: result.completedYaku.map((yaku) => yaku.name).join(", "),
  });
};

const handleKoikoi = () => {
  console.debug(activePlayer.value.id.toUpperCase(), ">>> Called KOI-KOI");
  ps.incrementBonus();
  showModal.value = false;
};

// Closing the round results modal
const handleNext = async () => {
  showLoader.value = true;
  ds.nextRound();
  showModal.value = false;
  await sleep(2000);
  startRound();
};

// Closing the final results modal
const handleClose = () => {
  showModal.value = false;
  cs.reset();
  ps.reset();
  ds.reset();
};

const startAuto = async () => {
  autoOpponent.value = false;
  roundOver.value = false;
  // Instant win conditions are not checked during autoplay
  autoPlay({ speed: 3, rounds: Infinity });
};

const startRound = async () => {
  // FIX: Opponent played twice on starting new round
  showLoader.value = false;
  autoOpponent.value = true;
  ds.startRound();
  const result = checkDeal();

  // Round is reset
  if (result === undefined) return;
  // Round is over
  if (result) {
    handleInstantWin(result as CompletionEvent);
    return;
  }
  if (ps.players.p2.isActive) opponentPlay({ speed: 2 });
};

const handleInstantWin = (result: CompletionEvent) => {
  handleCompletion(result);
  showModal.value = true;
  callStop();
};

const checkDeal = () => {
  // Check the field and each hand for a win condition
  const hands = [
    { name: "field", cards: cs.field },
    { name: ps.activePlayer.id, cards: cs.hand[ps.activePlayer.id] },
    { name: ps.inactivePlayer.id, cards: cs.hand[ps.inactivePlayer.id] },
  ];
  // If no condition exists, null will be returned
  var result = null;
  for (const hand of hands) {
    const completedYaku = checkForWin(hand.cards);
    if (completedYaku) {
      result = {
        player: hand.name,
        score: completedYaku.points,
        completedYaku: [completedYaku],
      };
      // Game round is reset if win condition exists on the field
      if (result?.player === "field") {
        console.log(
          `Revealed ${result.completedYaku[0].name.toUpperCase()}. Resetting...`
        );
        cs.reset();
        startRound();
        return;
      }
      // Add cards from the winner's hand to their collection for display in the results modal
      cs.stageForCollection(result.completedYaku[0].cards);
      cs.collectCards(hand.name as PlayerKey);
      break;
    }
  }
  return result;
};

watch(decisionIsPending, () => {
  if (decisionIsPending.value) showModal.value = true;
  if (koikoiIsCalled.value) handleKoikoi();
  if (stopIsCalled.value) handleStop();
});

watch([handsEmpty, turnCounter], () => {
  // Handle an exhaustive draw condition
  if (handsEmpty.value === true) {
    if (turnCounter.value < 9) return;
    if (decisionIsPending.value || stopIsCalled.value) return;
    showModal.value = true;
    // @ts-expect-error: CompletionEvent 'player' should not be null
    handleCompletion({ player: null, score: 0 });
    callStop();
    ds.endRound();
  }
});

watch(roundOver, () => {
  // Ensure modal is closed when starting a new round during autoplay
  if (gameOver.value === true) return;
  if (roundOver.value === false) showModal.value = false;
});

watch(activePlayer, () => {
  if (autoOpponent.value && ps.players.p2.isActive) {
    opponentPlay({ speed: 2 });
  }
});

watch(gameStart, () => {
  if (gameStart.value) {
    startRound();
  } else {
    ds.endRound();
    ds.nextRound();
    handleClose();
    console.info("Resetting game...")
  }
})

onBeforeUnmount(() => {
  console.debug("Unmounted play.vue")
  ds.endRound();
  ds.nextRound();
  handleClose();
})
</script>
