<template>
  <li v-for="(card, index) in displayedCards" :key="index" class="origin-center">
    <Transition
      appear
      mode="out-in"
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0 motion-safe:-translate-x-1"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 motion-safe:translate-x-1"
    >
      <div
        v-if="card"
        :class="{
          'card drop-shadow-md overflow-hidden cursor-pointer transition-transform relative': true,
          'scale-105 drop-shadow-xl -translate-y-2 z-20': matchedCards?.includes(card),
          '-translate-y-2 drop-shadow-xl': selectedCard === card,
          'pointer-events-none staged': cs.staged.has(card),
        }"
        @click="() => handleClick(card)"
      >
        <CardImage :src="getCardUrl(card)!" :card="card" />
      </div>

      <div
        v-else
        class="card border-none opacity-10 relative after:absolute after:inset-0 after:m-auto after:h-[90%] after:w-[90%] after:border after:border-white after:rounded-[inherit]"
      ></div>
    </Transition>
  </li>
</template>

<script setup lang="ts">
import { useCardDesign } from "~/composables/useCardDesign";
import { CardName } from "~/utils/cards";
import { useCardStore } from "~/stores/cardStore";
import { storeToRefs } from "pinia";

const displayedCards: (CardName | undefined)[] = reactive(Array(12));

const cs = useCardStore();
const { field } = storeToRefs(cs);

const placeCard = (cardName: CardName) => {
  const emptySlot = displayedCards.findIndex((card) => !card);
  displayedCards[emptySlot] = cardName;
};

const removeCard = (cardName: CardName) => {
  displayedCards[displayedCards.indexOf(cardName)] = undefined;
};

const updateDisplayedCards = () => {
  for (const card of displayedCards) {
    if (!card) continue;
    if (!cs.field.has(card)) {
      removeCard(card);
    }
  }
  for (const card of [...cs.field]) {
    if (!displayedCards.includes(card)) {
      placeCard(card);
    }
  }
};

watch(
  field,
  () => {
    updateDisplayedCards();
  },
  { deep: true }
);

const { getCardUrl } = useCardDesign();

const { useSelectedCard, useMatchedCards, handleCardSelect } = useCardHandler();

const selectedCard = useSelectedCard();
const matchedCards = useMatchedCards();

const handleClick = (card: CardName) => {
  handleCardSelect(card);
};

onMounted(() => {
  updateDisplayedCards();
});
</script>
