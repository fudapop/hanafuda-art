<template>
  <div :class="['relative w-24 mx-auto h-36', currentDesign]">
    <!-- Card Back (base layer) -->
    <div
      class="absolute inset-0 z-0 object-cover w-full h-full card down -translate-x-1/4"
      draggable="false"
    />
    <!-- Revealed Card (top layer, only if revealed) -->
    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="scale-95 opacity-0 -translate-y-1/4 -translate-x-3/4 motion-reduce:scale-100 motion-reduce:translate-y-0 motion-reduce:translate-x-1/2"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="scale-95 opacity-0 translate-x-3/4 motion-reduce:scale-100 motion-reduce:translate-x-1/2"
    >
      <CardImage
        v-if="revealedCard && revealedCardImg"
        :key="revealedCard"
        :card="revealedCard"
        :src="revealedCardImg"
        class="absolute inset-0 z-10 object-cover translate-x-1/2 rounded-[--card-radius]"
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
  resetOnUnmount = true,
} = defineProps<{
  design?: CardDesign
  autoReveal?: boolean
  intervalInMs?: number
  resetOnUnmount?: boolean
}>()

const { getCardUrl, useDesign, fetchCardUrls } = useCardDesign()
const currentDesign = useDesign()
const initialDesign = currentDesign.value

const revealedCard = ref<CardName | null>(null)
const revealedCardImg = computed(() => (revealedCard.value ? getCardUrl(revealedCard.value) : null))

const revealRandomCard = () => {
  revealedCard.value = getRandom([...DECK])
}

const interval = ref<NodeJS.Timeout | null>(null)

onMounted(() => {
  if (design) {
    currentDesign.value = design
    fetchCardUrls()
  }
  if (autoReveal) {
    revealRandomCard()
    interval.value = setInterval(revealRandomCard, intervalInMs)
  }
})

onUnmounted(() => {
  if (interval.value) {
    clearInterval(interval.value)
  }
  if (resetOnUnmount && currentDesign.value !== initialDesign) {
    currentDesign.value = initialDesign
  }
})
</script>
