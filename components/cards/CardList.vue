<template>
  <li
    v-for="card in cardImages"
    :key="card.name"
    :class="[
      stack ? '[&:not(:first-child)]:max-sm:-ml-3 sm:[&:not(:first-child)]:-ml-2' : '',
      'origin-center',
      currentDesign,
    ]"
  >
    <CardTransition>
      <div
        :class="{
          'card drop-shadow-md overflow-hidden cursor-pointer transition-transform relative': true,
          'scale-105 drop-shadow-lg -translate-y-2 z-20': matchedCards?.includes(card.name),
          '-translate-y-2 drop-shadow-lg': selectedCard === card.name,
          'pointer-events-none staged': cs.staged.has(card.name),
        }"
        :title="card.name.replace(/-\d?/g, ' ')"
        @click="() => handleClick(card.name)"
      >
        <CardImage
          v-if="card.source"
          :src="card.source"
          :card="card.name"
        />
        <!-- TODO: Add loading placeholder -->
      </div>
    </CardTransition>
  </li>
</template>

<script setup lang="ts">
import { useCardStore } from '~/stores/cardStore'
import { type CardName } from '~/utils/cards'

const { cards, stack = false } = defineProps<{
  cards: Set<CardName> | CardName[]
  stack?: boolean
}>()
const { getCardUrl, useDesign } = useCardDesign()
const currentDesign = useDesign()

const cardImages = computed(() =>
  [...cards].map((cardName) => ({
    name: cardName,
    source: getCardUrl(cardName),
  })),
)

const cs = useCardStore()
const { useSelectedCard, useMatchedCards, handleCardSelect } = useCardHandler()

const selectedCard = useSelectedCard()
const matchedCards = useMatchedCards()

const handleClick = (card: CardName) => {
  handleCardSelect(card)
}
</script>
