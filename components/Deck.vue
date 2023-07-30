<template>
  <div class="relative">
    <div class="absolute inset-0 my-auto overflow-visible">

      <!-- Show card-back image for face-down deck -->
      <div class="absolute inset-0 my-auto overflow-hidden card down">
      <img :src="useDesignPath('card-back')" alt="card-back image" class="absolute object-cover mx-auto shadow-none h-[--card-height]" />
      </div>

      <!-- Show revealed card when drawing from deck         -->
      <div v-if="revealedCard">
        <HeadlessTransitionRoot appear :show="true" as="template">
          <HeadlessTransitionChild enter="duration-300 ease-out" enter-from="opacity-0 motion-safe:-scale-x-50"
            enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100"
            leave-to="opacity-0 motion-safe:translate-x-1">
            <img :key="revealedCard" :src="useDesignPath(revealedCard)" :alt="revealedCard"
              class="object-cover mx-auto transition-transform -translate-x-4 card" />
          </HeadlessTransitionChild>
        </HeadlessTransitionRoot>
      </div>

      <!-- Show 'Draw Card' button after the first match/discard -->
      <button :key="gs.phase" v-else v-show="!selectedCard && gs.checkCurrentPhase('draw')" type="button"
        class="translate-x-[8px] translate-y-[52%] absolute inset-0 my-auto text-sm font-semibold text-white bg-indigo-600 shadow-sm card hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        @click="handleDraw">
        Draw Card
      </button>

      <!-- Show the 'Discard' button if there are no matches 
        on the field for the selected card -->
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
