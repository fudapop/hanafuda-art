<template>
  <ul class="h-full mx-auto w-max isolate">
    <li
      v-for="(card, index) in displayedCards.filter((card) => card)"
      :key="index"
      class="relative inline-flex -ml-4 transition-all duration-300 origin-center first:ml-0 pointer-events-auto"
    >
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
            'card drop-shadow-md overflow-hidden cursor-pointer transition-transform relative origin-bottom': true,
            'drop-shadow-xl -translate-y-2 z-20': matchedCards?.includes(card),
            'scale-105 -translate-y-4 drop-shadow-xl z-10': selectedCard === card,
            'pointer-events-none staged': cs.staged.has(card),
            '-translate-y-2 after:absolute after:inset-0 after:w-full after:h-full after:border-4 after:border-indigo-400 dark:after:border-yellow-200 after:rounded-[inherit] after:animate-pulse':
              showMatchHint(card),
          }"
          :title="card.replace(/-\d?/g, ' ')"
          @click="() => handleClick(card)"
        >
          <template v-if="useConfigStore().cardLabels">
            <CardLabel :card="card" />
          </template>
          <CardImage
            :src="getCardUrl(card)!"
            :card="card"
          />
        </div>
      </Transition>
      <Icon
        v-if="selectedCard === card"
        name="mdi:chevron-down"
        class="absolute inset-x-0 w-5 h-5 mx-auto -top-12 text-text"
        aria-hidden
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useCardDesign } from '~/composables/useCardDesign'
import { type CardName } from '~/utils/cards'
import { useCardStore } from '~~/stores/cardStore'
import { useConfigStore } from '~~/stores/configStore'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { type PlayerKey, usePlayerStore } from '~~/stores/playerStore'

const props = defineProps<{ id: PlayerKey; canInteract?: boolean }>()
const id = props.id

const displayedCards: (CardName | undefined)[] = reactive(Array(8))

// Get selected card state for dynamic spread control
const { useSelectedCard } = useCardHandler()
const selectedCard = useSelectedCard()

const ps = usePlayerStore()
const ds = useGameDataStore()
const cs = useCardStore()
const hand = computed(() => cs.hand[id])

const placeCard = (cardName: CardName) => {
  const emptySlot = displayedCards.findIndex((card) => !card)
  displayedCards[emptySlot] = cardName
}

const removeCard = (cardName: CardName) => {
  delete displayedCards[displayedCards.indexOf(cardName)]
}

const updateDisplayedCards = () => {
  for (const card of displayedCards) {
    if (!card) continue
    if (!hand.value.has(card)) {
      removeCard(card)
    }
  }
  for (const card of hand.value) {
    if (!displayedCards.includes(card)) {
      placeCard(card)
    }
  }
}

const { getCardUrl } = useCardDesign()

const { useMatchedCards, matchExists, handleCardSelect } = useCardHandler()
const { selfKey } = useLocalPlayerPerspective()

const matchedCards = useMatchedCards()

const showMatchHint = computed(
  () => (card: CardName) =>
    // Only show hints on the local player's hand, when they are active in select phase
    id === selfKey.value &&
    ds.checkCurrentPhase('select') &&
    ps.players[id].isActive &&
    (matchExists(card) as CardName[]).length,
)

const handleClick = (card: CardName) => {
  // Final guard: only allow interaction when parent says this hand can interact
  if (props.canInteract === false) return
  handleCardSelect(card)
}

const cleanupHand = watch(
  hand,
  () => {
    updateDisplayedCards()
  },
  { deep: true },
)

onMounted(() => {
  updateDisplayedCards()
})

onUnmounted(() => {
  cleanupHand()
})
</script>
