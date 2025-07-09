<template>
  <ul
    class="relative h-full mx-auto w-max isolate"
    :class="containerClasses"
  >
    <li
      v-for="(card, index) in displayedCards.filter((card) => card)"
      :key="index"
      class="absolute transition-all duration-300 origin-center"
      :style="styleArr[index]"
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
            'card drop-shadow-md overflow-hidden cursor-pointer transition-transform relative': true,
            'drop-shadow-xl -translate-y-2 z-20': matchedCards?.includes(card),
            '-translate-y-20 drop-shadow-xl': selectedCard === card,
            'pointer-events-none staged': cs.staged.has(card),
            '-translate-y-2 after:absolute after:inset-0 after:w-full after:h-full after:border-4 after:border-indigo-400 after:dark:border-yellow-200 after:rounded-[inherit] after:animate-pulse':
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
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useBreakpoints, useScreenOrientation } from '@vueuse/core'
import { useCardDesign } from '~/composables/useCardDesign'
import { useCardStore } from '~/stores/cardStore'
import { useConfigStore } from '~/stores/configStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { type PlayerKey, usePlayerStore } from '~/stores/playerStore'
import { type CardName } from '~/utils/cards'

const { id } = defineProps<{ id: PlayerKey }>()

const displayedCards: (CardName | undefined)[] = reactive(Array(8))
const styleArr: string[] = reactive([])

// Breakpoint and orientation detection
const breakpoints = useBreakpoints({
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
})

const { orientation } = useScreenOrientation()
const isLandscape = computed(() => orientation.value?.includes('landscape'))

const isMobile = breakpoints.smaller('sm')
const isTablet = breakpoints.between('sm', 'md')

// Enhanced responsive container classes
const containerClasses = computed(() => ({
  'pr-[20px]': isMobile.value && !isLandscape.value,
  'pr-[30px] landscape:[--card-height:160px]': isMobile.value && isLandscape.value, // Bigger cards in landscape
  'pr-[40px]': isTablet.value,
  'pr-[60px]': breakpoints.greaterOrEqual('md').value,
}))

// Get selected card state for dynamic spread control
const { useSelectedCard } = useCardHandler()
const selectedCard = useSelectedCard()

// Enhanced dynamic spread multiplier with landscape consideration
const spreadMultiplier = computed(() => {
  if (!isMobile.value) return 1 // Only apply dynamic spread on mobile

  // Landscape mode gets more spread due to wider screen
  const baseMultiplier = isLandscape.value ? 1.2 : 1

  // Expand spread when a card is selected for better visibility
  return selectedCard.value ? baseMultiplier * 1.4 : baseMultiplier
})

const generateStyle = () => {
  styleArr.splice(0)
  const multiplier = spreadMultiplier.value

  if (isMobile.value) {
    // Mobile: Dynamic spread based on selection state and orientation
    const baseTranslations =
      isLandscape.value ?
        [-110, -75, -45, -15, 15, 45, 75, 110] // Wider spread for landscape
      : [-90, -62, -36, -12, 12, 36, 62, 90] // Normal mobile spread

    const baseRotations = [-8, -5, -3, -1, 1, 3, 5, 8]
    const baseYOffsets = [-4, -3, -1, 0, 0, -1, -3, -4]

    baseTranslations.forEach((translation, index) => {
      const adjustedTranslation = Math.round(translation * multiplier)
      const rotation = baseRotations[index]
      const yOffset = baseYOffsets[index]

      styleArr.push(
        `z-index: ${index + 1}; transform: rotate(${rotation}deg) translate(${adjustedTranslation}px, ${yOffset}px);`,
      )
    })
  } else if (isTablet.value) {
    // Tablet: Medium spread
    styleArr.push(
      'z-index: 1; transform: rotate(-8deg) translate(-120px, -6px);',
      'z-index: 2; transform: rotate(-6deg) translate(-85px, -4px);',
      'z-index: 3; transform: rotate(-3deg) translate(-52px, -2px);',
      'z-index: 4; transform: rotate(-1deg) translate(-20px, 0px);',
      'z-index: 5; transform: rotate(1deg) translate(20px, 0px);',
      'z-index: 6; transform: rotate(3deg) translate(52px, -2px);',
      'z-index: 7; transform: rotate(6deg) translate(85px, -4px);',
      'z-index: 8; transform: rotate(8deg) translate(120px, -6px);',
    )
  } else {
    // Desktop: Full spread (original values)
    styleArr.push(
      'z-index: 1; transform: rotate(-10deg) translate(-180px, -10px);',
      'z-index: 2; transform: rotate(-8deg) translate(-130px, -6px);',
      'z-index: 3; transform: rotate(-5deg) translate(-78px, -2px);',
      'z-index: 4; transform: rotate(-2deg) translate(-28px, 0px);',
      'z-index: 5; transform: rotate(2deg) translate(28px, 0px);',
      'z-index: 6; transform: rotate(5deg) translate(78px, -2px);',
      'z-index: 7; transform: rotate(8deg) translate(130px, -6px);',
      'z-index: 8; transform: rotate(10deg) translate(180px, -10px);',
    )
  }
}

const cs = useCardStore()
const hand = computed(() => cs.hand[id])

const placeCard = (cardName: CardName) => {
  const emptySlot = displayedCards.findIndex((card) => !card)
  displayedCards[emptySlot] = cardName
}

const removeCard = (cardName: CardName) => {
  delete displayedCards[displayedCards.indexOf(cardName)]
  updateStyle()
}

const updateStyle = () => {
  if (styleArr.length % 2) {
    styleArr.shift()
  } else {
    styleArr.pop()
  }
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

// Watch for screen size and orientation changes
watch([isMobile, isTablet, isLandscape], () => {
  generateStyle()
})

// Watch for selected card changes to adjust spread dynamically
watch(selectedCard, () => {
  if (isMobile.value) {
    generateStyle()
  }
})

watch(
  hand,
  () => {
    if (hand.value.size === 8) generateStyle()
    updateDisplayedCards()
  },
  { deep: true },
)

const { getCardUrl } = useCardDesign()

const { useMatchedCards, matchExists, handleCardSelect } = useCardHandler()

const matchedCards = useMatchedCards()

const showMatchHint = computed(
  () => (card: CardName) =>
    useGameDataStore().checkCurrentPhase('select') &&
    usePlayerStore().players.p1.isActive &&
    (matchExists(card) as CardName[]).length,
)

const handleClick = (card: CardName) => {
  handleCardSelect(card)
}

onMounted(() => {
  generateStyle()
  updateDisplayedCards()
})
</script>
