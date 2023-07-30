<template>
  <li v-for="card in cardImages" :key="card.name"
    :class="`${stack ? '[&:not(:first-child)]:-ml-2' : ''} origin-center`">
    <!-- <ClickTarget @locate="console.log"> -->
      <CardTransition>
          <div :class="{
            'max-h-[--card-height] aspect-[--card-aspect] overflow-hidden cursor-pointer transition-transform': true,
            'scale-105 shadow-md -translate-y-2 z-20': matchingCards?.includes(card.name),
            '-translate-y-2 shadow-md': selectedCard === card.name,
            'pointer-events-none staged': cs.staged.has(card.name),
          }" @click="() => handleClick(card.name)">
            <img :src="card.source" :alt="card.name" class="object-cover mx-auto card" />
          </div>
      </CardTransition>
    <!-- </ClickTarget> -->
  </li>
</template>

<script setup lang="ts">
import { useCardDesign } from "~/composables/useCardDesign";
import { CardName } from "~/scripts/cards";
import { useCardStore } from "~/stores/cardStore";

const { cards, stack = false } = defineProps<{
  cards: Set<CardName> | CardName[];
  stack?: boolean;
}>();

const { useDesignPath } = useCardDesign();

const cardImages = computed(() =>
  [...cards].map((cardName) => ({
    name: cardName,
    source: useDesignPath(cardName),
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
