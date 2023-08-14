<template>
  <div class="relative">
    <div class="absolute inset-0 my-auto overflow-visible">
      <div
        v-if="ps.bonusMultiplier > 1"
        class="w-full sm:w-1/2 text-white bg-black/25 rounded-md tracking-wide absolute top-3/4 sm:top-1/4 after:content-['KOI-KOI'] after:text-[0.6rem] after:font-semibold after:w-full after:block after:text-center"
      >
        <TransitionGroup appear name="stamp">
          <div
            :title="`Winning score x${n}!`"
            v-for="n in ps.bonusMultiplier - 1"
            :key="n"
            class="absolute w-6 h-6 mt-3 -z-10"
            :style="{ marginLeft: `${(n - 1) * 10}px` }"
          >
            <img
              src="/images/coin.webp"
              alt="koi-koi bonus"
              class="object-cover object-center drop-shadow-md"
            />
          </div>
        </TransitionGroup>
        <span class="absolute w-full mt-3 text-center drop-shadow-lg"
          >x{{ ps.bonusMultiplier }}</span
        >
      </div>

      <!-- DECK PILE -->
      <div
        class="absolute inset-y-0 my-auto sm:right-4 overflow-hidden shadow-md card down"
      ></div>

      <!-- Show revealed card when drawing from deck         -->
      <HeadlessTransitionRoot appear :show="!!revealedCard" as="template">
        <HeadlessTransitionChild
          enter="duration-300 ease-out"
          enter-from="opacity-0 motion-safe:-scale-x-50"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0 motion-safe:translate-x-1"
        >
          <CardImage
            v-if="revealedCard && revealedCardImg"
            :key="revealedCard"
            :card="revealedCard"
            :src="revealedCardImg"
            class="object-cover mx-auto transition-transform -translate-x-4 sm:translate-x-3/4 card drop-shadow-lg"
          />
        </HeadlessTransitionChild>
      </HeadlessTransitionRoot>

      <!-- Show 'Draw Card' button after the first match/discard -->
      <!-- <button v-else v-show="!selectedCard && ds.checkCurrentPhase('draw')" type="button"
        class="translate-x-[8px] translate-y-[52%] absolute inset-0 my-auto text-sm font-semibold text-white bg-indigo-600 shadow-sm card hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        @click="handleDraw">
        Draw Card
      </button> -->

      <!-- Show the 'Discard' button if there are no matches 
        on the field for the selected card -->
      <Button
        v-if="selectedCard && !matchedCards.length && ps.players.p1.isActive"
        v-show="ds.checkCurrentPhase('select')"
        button-class="primary"
        :action="matchOrDiscard"
      >
        <span class="animate-pulse"> Discard </span>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameDataStore } from "~/stores/gameDataStore";
import { usePlayerStore } from "~/stores/playerStore";
import { useCardHandler } from "~/composables/useCardHandler";
import { useCardDesign } from "~/composables/useCardDesign";

const ps = usePlayerStore();
const ds = useGameDataStore();

const { getCardUrl } = useCardDesign();

const { useSelectedCard, useMatchedCards, useActions } = useCardHandler();
const { decisionIsPending } = useDecisionHandler();
const { draw, matchOrDiscard, collect } = useActions();

const { errorOnTimeout } = useTimeout();

const selectedCard = useSelectedCard();
const matchedCards = useMatchedCards();
const revealedCard = computed(() => ds.checkCurrentPhase("draw") && selectedCard.value);
const revealedCardImg = computed(() =>
  revealedCard.value ? getCardUrl(revealedCard.value) : null
);

const isDrawPhase = computed(
  () => ds.checkCurrentPhase("draw") && ps.players.p1.isActive
);
const autoOpponent = useState("opponent");

const playDrawPhase = async () => {
  draw();
  await sleep();
  // Allow player to select match
  if (matchedCards.value.length === 2) {
    await errorOnTimeout(selectMatchFromField, 10000, "match-on-draw", {
      startMsg: "Awaiting match selection...",
      callback: ds.endRound,
      endMsg: "Resetting...",
    })();
  } else {
    matchOrDiscard();
  }
  await sleep();
  collect();
  await sleep();
  while (decisionIsPending.value) {
    await sleep();
  }
  ds.nextPhase();
};

const selectMatchFromField = async () => {
  while (selectedCard.value) {
    if (ds.roundOver || ds.gameOver) break;
    console.log("Awaiting match selection...");
    await sleep();
  }
};

watch(isDrawPhase, () => {
  if (isDrawPhase.value) {
    // If P2 is active, the turn is controlled by useAutoplay
    if (autoOpponent.value && ps.players.p1.isActive) {
      // Autoplay the draw phase for P1
      playDrawPhase();
    }
  }
});
</script>
