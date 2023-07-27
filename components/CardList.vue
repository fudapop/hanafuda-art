<template>
  <li
    v-for="card in cardImages"
    :key="card.name"
    :class="`${stack ? '[&:not(:first-child)]:-ml-2' : ''} p-[1px] group origin-center`"
  >
    <ClickTarget @locate="console.log">
      <div
        :class="{
          'max-h-[--card-h] aspect-[--card-ar] cursor-pointer transition-transform': true,
          'outline outline-green-400 scale-110 group-odd:-translate-y-2 group-even:translate-y-2 translate-x-2 z-20': matchingCards?.includes(
            card.name
          ),
          '-translate-y-2': selectedCard === card.name,
          'opacity-50 grayscale pointer-events-none': cs.staged.has(card.name),
        }"
        @click="() => handleClick(card.name)"
      >
        <img :src="card.source" :alt="card.name" class="object-contain mx-auto" />
      </div>
    </ClickTarget>
  </li>
</template>

<script setup lang="ts">
import { CardName } from "~/scripts/cards";
import { useCardStore } from "~/stores/cardStore";

const { cards, stack = false } = defineProps<{
  cards: Set<CardName> | CardName[];
  stack?: boolean;
}>();

const cardImages = computed(() =>
  [...cards].map((cardName) => ({
    name: cardName,
    source: `webp/flash-black__${cardName}.webp`,
  }))
);

const cs = useCardStore();
const { useSelectedCard, useMatchedCards, handleCardSelect } = useCardHandler();

const selectedCard = useSelectedCard();
const matchingCards = useMatchedCards();

const handleClick = (card: CardName) => {
  handleCardSelect(card);
};
</script>
