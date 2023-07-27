<template>
  <div v-show="cs.field.size > 0" class="relative">
    <div class="absolute inset-0 my-auto bg-slate-800 border card">
      <img
        v-if="revealedCard"
        :src="`webp/flash-black__${revealedCard}.webp`"
        :alt="revealedCard"
        class="object-contain mx-auto"
      />

      <button
        v-else
        v-show="!selectedCard && gs.checkCurrentPhase('draw')"
        type="button"
        class="absolute my-auto inset-0 card bg-indigo-600 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        @click="handleDraw"
      >
        Draw Card
      </button>

      <button
        v-if="selectedCard && !matchedCards?.length"
        type="button"
        class="absolute inset-0 my-auto text-sm font-semibold text-white bg-red-600 rounded-sm shadow-sm card hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        :style="revealedCard ? { translate: '0 100%' } : {}"
        @click="handleDiscard"
      >
        Discard
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGlobalStore } from "~/stores/globalStore";
import { useCardStore } from "~/stores/cardStore";
import { useCardHandler } from "~/composables/useCardHandler";

const cs = useCardStore();
const gs = useGlobalStore();
const { toggleActivePlayer } = gs;

const { useSelectedCard, useMatchedCards } = useCardHandler();
const selectedCard = useSelectedCard();
const matchedCards = useMatchedCards();
const revealedCard = computed(() => gs.checkCurrentPhase("draw") && selectedCard.value);

const handleDraw = () => {
  selectedCard.value = cs.revealCard();
  handleReveal();
};

const handleReveal = async () => {
  // Wait for player match selection or discard
  while (selectedCard.value) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.info("Awaiting selection...");
  }
  toggleActivePlayer();
};

const handleDiscard = () => {
  if (selectedCard.value === null) return;
  cs.discard(selectedCard.value, gs.activePlayer.id);
  selectedCard.value = null;
  gs.nextPhase();
};
</script>
