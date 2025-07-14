<template>
  <div :class="['relative w-24 mx-auto h-36', design]">
    <!-- Card Back (base layer) -->
    <div
      class="absolute inset-0 z-0 object-cover w-full h-full card down -translate-x-1/4"
      draggable="false"
    />
    <!-- Revealed Card (top layer, only if revealed) -->
    <Transition
      enter-active-class="duration-500 ease-out"
      enter-from-class="opacity-0 -scale-x-25 -translate-x-3/4 -translate-y-1/4"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <CardImage
        v-if="revealedCard && revealedCardImg"
        :key="revealedCard"
        :card="revealedCard"
        :src="revealedCardImg"
        class="absolute top-1/8 left-1/2 z-10 object-cover rounded-[--card-radius]"
      />
    </Transition>
    <!-- Clickable area for revealing a card -->
    <button
      class="absolute inset-0 z-20 w-full h-full bg-transparent"
      @click="revealRandomCard"
      aria-label="Reveal random card"
    />
  </div>
</template>

<script setup lang="ts">
import { useCardDesign } from '~/composables/useCardDesign'
import { type CardName, DECK } from '~/utils/cards'

const {
  design,
  autoReveal = true,
  intervalInMs = 3000,
} = defineProps<{
  design: CardDesign
  autoReveal?: boolean
  intervalInMs?: number
}>()

const { getCardUrl } = useCardDesign()

const revealedCard = ref<CardName | null>(null)
const revealedCardImg = computed(() =>
  revealedCard.value ? getCardUrl(revealedCard.value, design) : null,
)

const timeout = ref<NodeJS.Timeout | null>(null)

const scheduleNextReveal = () => {
  if (timeout.value) clearTimeout(timeout.value)
  timeout.value = setTimeout(() => {
    revealRandomCard()
    if (autoReveal) {
      scheduleNextReveal() // Schedule the next one
    }
  }, intervalInMs)
}

const revealRandomCard = () => {
  revealedCard.value = getRandom([...DECK])
  // Reset the timer when manually revealing a card
  if (autoReveal) {
    scheduleNextReveal()
  }
}

onMounted(() => {
  if (autoReveal) {
    revealRandomCard()
    scheduleNextReveal()
  }
})

onUnmounted(() => {
  if (timeout.value) {
    clearTimeout(timeout.value)
  }
})
</script>
