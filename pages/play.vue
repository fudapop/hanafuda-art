<template>
  <GameLayout>
    <CircularLoader :show="showLoader"> Starting the next round... </CircularLoader>
    <div class="absolute top-4 right-4">
      <DesignSelector />
    </div>
    <div
      class="z-10 grid grid-rows-[--table-grid-rows] w-full min-w-[320px] max-w-[1200px] h-full min-h-[500px] mx-auto"
    >
      <!-- OPPONENT HAND -->
      <OpponentArea />

      <!-- OPPONENT COLLECTION -->
      <div class="-translate-y-8 pointer-events-none -z-10">
        <CollectionArea player="p2" @completed="(data) => handleCompletion(data)" />
      </div>

      <!-- FIELD -->
      <div
        v-click-disabled:unless="players.p1.isActive && !!selectedCard"
        class="max-md:[--card-height:80px] place-content-center grid grid-cols-[80px_1fr]"
      >
        <Deck />
        <ListGrid :cols="6" :rows="2" flow="column" gap="4px">
          <CardList :cards="field" />
        </ListGrid>
      </div>

      <!-- PLAYER COLLECTION -->
      <div class="h-full pointer-events-none -z-10">
        <CollectionArea player="p1" @completed="(data) => handleCompletion(data)" />
      </div>

      <!-- PLAYER HAND -->
      <div
        v-click-disabled:unless="players.p1.isActive && ds.checkCurrentPhase('select')"
        class="max-sm:[--card-height:85px] max-md:[--card-height:90px] min-[400px]:mx-auto w-max grid translate-y-8"
      >
        <ListGrid :cols="8" :rows="'auto'" flow="row" gap="4px">
          <CardList :cards="hand.p1" :stack="true" />
        </ListGrid>
      </div>
    </div>

    <LazyResultsModal :show="showModal">
      <LazyRoundResults @next="handleNext" />
      <!-- TODO: if last round <FinalResults /> -->
    </LazyResultsModal>

    <!-- DEV BUTTONS -->
    <div
      v-if="deck.size === 48 || (roundOver && !showLoader)"
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
import { usePlayerStore } from "~/stores/playerStore";
import { useCardStore } from "~/stores/cardStore";
import { CompletionEvent } from "~/components/CollectionArea.vue";

definePageMeta({
  requiresAuth: true,
  middleware: ["auth"],
});

const cs = useCardStore();
const ps = usePlayerStore();
const ds = useGameDataStore();
const { hand, field, deck } = storeToRefs(cs);
const { players, activePlayer } = storeToRefs(ps);
const { roundOver, gameOver } = storeToRefs(ds);

const { useSelectedCard } = useCardHandler();
const selectedCard = useSelectedCard();

const { autoPlay, opponentPlay, useOpponent } = useAutoplay();
const autoOpponent: Ref<boolean> = useOpponent();

const showModal = ref(false);
const showLoader = ref(false);

const {
  decisionIsPending,
  makeDecision,
  koikoiIsCalled,
  stopIsCalled,
} = useDecisionHandler();

const handleCompletion = (data: CompletionEvent) => {
  const { player, score, completedYaku } = data;
  ps.updateScore(player, score * ps.bonusMultiplier);
  const message = `${player.toUpperCase()} *** Completed ${completedYaku
    .map((s) => s.toUpperCase())
    .join(" + ")}!`;
  consoleLogColor(message, "skyblue");
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
  console.debug(activePlayer.value.id.toUpperCase(), ">>> Called STOP");
  ds.endRound();
  const result = ds.getCurrent.result;
  console.log(
    ...Object.entries(result as Object).map((arr) => arr.join(": ").toUpperCase() + "\n")
  );
};

const handleKoikoi = () => {
  console.debug(activePlayer.value.id.toUpperCase(), ">>> Called KOI-KOI");
  ps.incrementBonus();
  showModal.value = false;
};

const handleNext = async () => {
  showLoader.value = true;
  ds.nextRound();
  showModal.value = false;
  await sleep(2000);
  startRound();
};

const startAuto = async () => {
  autoOpponent.value = false;
  roundOver.value = false;
  autoPlay({ speed: 3, rounds: 3 });
};

const startRound = () => {
  // FIX: Opponent played twice on starting new round
  showLoader.value = false;
  autoOpponent.value = true;
  ds.startRound();
  if (ps.players.p2.isActive) opponentPlay({ speed: 2 });
};

watch(decisionIsPending, () => {
  if (decisionIsPending.value) showModal.value = true;
  if (koikoiIsCalled.value) handleKoikoi();
  if (stopIsCalled.value) handleStop();
});

// This breaks, but we still need a way to handle an exhaustive draw.
// watch(handsEmpty, () => {
//   if (handsEmpty.value === true && !decisionIsPending.value) showModal.value = true;
// });
watch(gameOver, async () => {
  if (gameOver.value === true) {
    cs.reset();
    ps.reset();
    await sleep(2000);
    ds.reset();
  }
});

watch(roundOver, () => {
  // Ensure modal is closed when starting a new round during autoplay
  if (roundOver.value === false) showModal.value = false;
});

watch(activePlayer, () => {
  if (autoOpponent.value && ps.players.p2.isActive) {
    // while (decisionIsPending.value) await sleep();
    opponentPlay({ speed: 2 });
  }
});
</script>
