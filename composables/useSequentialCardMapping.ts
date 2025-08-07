import type { CardName } from '~/utils/cards'
import { CARDS } from '~/utils/cards'
import { useCardMapping } from './useCardMapping'

/**
 * Enhanced composable for sequential card mapping workflow
 * Builds on top of useCardMapping with navigation and sequential logic
 */
export const useSequentialCardMapping = () => {
  // Use the base card mapping functionality
  const cardMapping = useCardMapping()

  // Sequential workflow state
  const currentCardIndex = ref(0)
  const skippedCards = ref<Set<CardName>>(new Set())
  const isInReviewMode = ref(false)

  // Get all cards as an ordered array
  const allCards = computed(() => Object.values(CARDS))

  // Current card being mapped
  const currentCard = computed(() => allCards.value[currentCardIndex.value])

  // Progress tracking
  const totalCards = computed(() => allCards.value.length)

  const sequentialProgress = computed(() => {
    const total = totalCards.value
    const completed = cardMapping.totalMappings.value
    const skipped = skippedCards.value.size
    const remaining = total - completed - skipped

    return {
      total,
      completed,
      skipped,
      remaining,
      currentIndex: currentCardIndex.value,
      percentage: Math.round(((currentCardIndex.value + 1) / total) * 100),
    }
  })

  // Navigation helpers
  const canGoNext = computed(() => currentCardIndex.value < totalCards.value - 1)
  const canGoPrevious = computed(() => currentCardIndex.value > 0)
  const isLastCard = computed(() => currentCardIndex.value === totalCards.value - 1)

  // Cards that still need mapping
  const unmappedCards = computed(() => {
    const mapped = new Set(Array.from(cardMapping.mappings.value.keys()))
    return allCards.value.filter((card) => !mapped.has(card.name))
  })

  // Check if current card is mapped
  const isCurrentCardMapped = computed(() => {
    return currentCard.value ? cardMapping.isCardMapped(currentCard.value.name) : false
  })

  // Check if current card was skipped
  const isCurrentCardSkipped = computed(() => {
    return currentCard.value ? skippedCards.value.has(currentCard.value.name) : false
  })

  // Check if any card was skipped
  const isCardSkipped = (cardName: CardName): boolean => {
    return skippedCards.value.has(cardName)
  }

  // Navigation methods
  const goToNext = (): boolean => {
    if (!canGoNext.value) return false
    currentCardIndex.value++
    return true
  }

  const goToPrevious = (): boolean => {
    if (!canGoPrevious.value) return false
    currentCardIndex.value--
    return true
  }

  const goToCard = (index: number): boolean => {
    if (index < 0 || index >= totalCards.value) return false
    currentCardIndex.value = index
    return true
  }

  const goToFirstUnmapped = (): boolean => {
    for (let i = 0; i < allCards.value.length; i++) {
      const card = allCards.value[i]
      if (!cardMapping.isCardMapped(card.name) && !skippedCards.value.has(card.name)) {
        currentCardIndex.value = i
        return true
      }
    }
    return false
  }

  // Skip management
  const skipCurrentCard = (): boolean => {
    if (!currentCard.value) return false
    skippedCards.value.add(currentCard.value.name)
    return true
  }

  const unskipCard = (cardName: CardName): boolean => {
    return skippedCards.value.delete(cardName)
  }

  const clearAllSkips = (): void => {
    skippedCards.value.clear()
  }

  // Mapping methods (delegated to base composable)
  const mapCurrentCard = (fileIndex: number, file: File): boolean => {
    if (!currentCard.value) return false

    // Remove from skipped if it was skipped
    skippedCards.value.delete(currentCard.value.name)

    return cardMapping.addMapping(fileIndex, currentCard.value.name, file)
  }

  const unmapCurrentCard = (): boolean => {
    if (!currentCard.value) return false
    return cardMapping.removeMappingByCard(currentCard.value.name)
  }

  // Review mode
  const enterReviewMode = (): void => {
    isInReviewMode.value = true
  }

  const exitReviewMode = (): void => {
    isInReviewMode.value = false
  }

  // Completion check
  const canFinish = computed(() => {
    return cardMapping.isComplete.value && unmappedCards.value.length === 0
  })

  const getCompletionStatus = () => {
    const total = totalCards.value
    const mapped = cardMapping.totalMappings.value
    const skipped = skippedCards.value.size
    const remaining = total - mapped

    return {
      isComplete: remaining === 0,
      canUpload: mapped === total,
      summary: {
        total,
        mapped,
        skipped,
        remaining,
        needsAttention: remaining > 0,
      },
    }
  }

  // Reset everything
  const resetSequentialMapping = (): void => {
    currentCardIndex.value = 0
    skippedCards.value.clear()
    isInReviewMode.value = false
    cardMapping.clearAllMappings()
  }

  // Auto-navigation: go to next unmapped card
  const goToNextUnmapped = (): boolean => {
    // Start from current position and look forward
    for (let i = currentCardIndex.value + 1; i < allCards.value.length; i++) {
      const card = allCards.value[i]
      if (!cardMapping.isCardMapped(card.name) && !skippedCards.value.has(card.name)) {
        currentCardIndex.value = i
        return true
      }
    }

    // If no unmapped cards found ahead, wrap around to beginning
    for (let i = 0; i < currentCardIndex.value; i++) {
      const card = allCards.value[i]
      if (!cardMapping.isCardMapped(card.name) && !skippedCards.value.has(card.name)) {
        currentCardIndex.value = i
        return true
      }
    }

    return false
  }

  return {
    // Sequential state
    currentCardIndex: readonly(currentCardIndex),
    currentCard,
    totalCards,
    skippedCards: readonly(skippedCards),
    isInReviewMode: readonly(isInReviewMode),
    allCards,

    // Progress
    sequentialProgress,

    // Status checks
    canGoNext,
    canGoPrevious,
    isLastCard,
    isCurrentCardMapped,
    isCurrentCardSkipped,
    isCardSkipped,
    canFinish,
    unmappedCards,

    // Navigation
    goToNext,
    goToPrevious,
    goToCard,
    goToFirstUnmapped,
    goToNextUnmapped,

    // Mapping actions
    mapCurrentCard,
    unmapCurrentCard,
    skipCurrentCard,
    unskipCard,
    clearAllSkips,

    // Review mode
    enterReviewMode,
    exitReviewMode,

    // Status
    getCompletionStatus,

    // Reset
    resetSequentialMapping,

    // Expose base composable methods
    ...cardMapping,
  }
}
