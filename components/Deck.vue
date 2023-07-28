<template>
  <div class="relative">
    <div class="absolute inset-0 my-auto overflow-visible bg-slate-800 card">
      <img :key="revealedCard" v-if="revealedCard" :src="useDesignPath(revealedCard)" :alt="revealedCard"
        class="object-cover mx-auto transition-transform -translate-x-2 -translate-y-[53%] card" />

      <button :key="gs.phase" v-else v-show="!selectedCard && gs.checkCurrentPhase('draw')" type="button"
        class="translate-x-[8px] translate-y-[52%] absolute inset-0 my-auto text-sm font-semibold text-white bg-indigo-600 shadow-sm card hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        @click="handleDraw">
        Draw Card
      </button>

      <button :key="gs.phase" v-if="selectedCard && !matchedCards?.length" type="button"
        class="translate-x-[8px] translate-y-[52%] absolute inset-0 my-auto text-sm font-semibold text-white bg-red-600 shadow-sm card hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        @click="handleDiscard">
        Discard
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGlobalStore } from "~/stores/globalStore";
import { useCardStore } from "~/stores/cardStore";
import { useCardHandler } from "~/composables/useCardHandler";
import { useCardDesign } from "~/composables/useCardDesign";

const cs = useCardStore();
const gs = useGlobalStore();
const { toggleActivePlayer } = gs;

const { useDesignPath } = useCardDesign();

const { useSelectedCard, useMatchedCards, handleCardSelect } = useCardHandler();
const selectedCard = useSelectedCard();
const matchedCards = useMatchedCards();
const revealedCard = computed(() => gs.checkCurrentPhase("draw") && selectedCard.value);

const handleDraw = async () => {
  handleCardSelect(cs.revealCard());
  // Wait for player match selection or discard
  while (selectedCard.value) {
    await sleep(500);
    console.info("Awaiting selection...");
  }
  while (useState("decision").value) {
    await sleep(500);
    console.info("Awaiting decision...");
  }
  if (!cs.handsEmpty) toggleActivePlayer();
};

const handleDiscard = () => {
  if (selectedCard.value === null) return;
  cs.discard(selectedCard.value, gs.activePlayer.id);
  selectedCard.value = null;
  gs.nextPhase();
};
</script>
