import type { CardName } from '~/utils/cards'

export type CardMapping = {
  fileIndex: number
  cardName: CardName
  file: File
}

export type MappingState = {
  mappings: Map<CardName, CardMapping>
  mappedFiles: Set<number>
}

/**
 * Composable for managing drag-and-drop card mapping functionality
 * Handles mapping between uploaded files and hanafuda cards
 */
export const useCardMapping = () => {
  // State
  const mappings = ref<Map<CardName, CardMapping>>(new Map())
  const mappedFiles = ref<Set<number>>(new Set())
  const isDragging = ref(false)
  const draggedFileIndex = ref<number | null>(null)

  // Computed properties
  const totalMappings = computed(() => mappings.value.size)
  const mappingProgress = computed(() => {
    const total = 48 // Total hanafuda cards
    return {
      mapped: totalMappings.value,
      total,
      percentage: Math.round((totalMappings.value / total) * 100),
    }
  })

  const isComplete = computed(() => totalMappings.value === 48)

  // Check if a file is already mapped
  const isFileMapped = (fileIndex: number): boolean => {
    return mappedFiles.value.has(fileIndex)
  }

  // Check if a card is already mapped
  const isCardMapped = (cardName: CardName): boolean => {
    return mappings.value.has(cardName)
  }

  // Get mapping for a specific card
  const getCardMapping = (cardName: CardName): CardMapping | null => {
    return mappings.value.get(cardName) || null
  }

  // Get all mappings as an array
  const getAllMappings = (): CardMapping[] => {
    return Array.from(mappings.value.values())
  }

  // Add a new mapping
  const addMapping = (fileIndex: number, cardName: CardName, file: File): boolean => {
    // Validate mapping
    if (isFileMapped(fileIndex)) {
      console.warn(`File at index ${fileIndex} is already mapped`)
      return false
    }

    if (isCardMapped(cardName)) {
      console.warn(`Card ${cardName} is already mapped`)
      return false
    }

    // Create mapping
    const mapping: CardMapping = {
      fileIndex,
      cardName,
      file,
    }

    // Update state
    mappings.value.set(cardName, mapping)
    mappedFiles.value.add(fileIndex)

    return true
  }

  // Remove a mapping by card name
  const removeMappingByCard = (cardName: CardName): boolean => {
    const mapping = mappings.value.get(cardName)
    if (!mapping) {
      return false
    }

    mappings.value.delete(cardName)
    mappedFiles.value.delete(mapping.fileIndex)
    return true
  }

  // Remove a mapping by file index
  const removeMappingByFile = (fileIndex: number): boolean => {
    // Find the mapping with this file index
    let cardToRemove: CardName | null = null
    for (const [cardName, mapping] of mappings.value.entries()) {
      if (mapping.fileIndex === fileIndex) {
        cardToRemove = cardName
        break
      }
    }

    if (cardToRemove) {
      return removeMappingByCard(cardToRemove)
    }

    return false
  }

  // Clear all mappings
  const clearAllMappings = (): void => {
    mappings.value.clear()
    mappedFiles.value.clear()
  }

  // Drag and drop state management
  const startDrag = (fileIndex: number): void => {
    if (isFileMapped(fileIndex)) {
      console.warn(`Cannot drag file at index ${fileIndex} - already mapped`)
      return
    }

    isDragging.value = true
    draggedFileIndex.value = fileIndex
  }

  const endDrag = (): void => {
    isDragging.value = false
    draggedFileIndex.value = null
  }

  // Handle drop operation
  const handleDrop = (cardName: CardName, files: File[]): boolean => {
    if (!isDragging.value || draggedFileIndex.value === null) {
      return false
    }

    const fileIndex = draggedFileIndex.value
    const file = files[fileIndex]

    if (!file) {
      console.error(`No file found at index ${fileIndex}`)
      endDrag()
      return false
    }

    const success = addMapping(fileIndex, cardName, file)
    endDrag()
    return success
  }

  // Validate that all cards are mapped before upload
  const validateComplete = (): { isValid: boolean; missingCards: CardName[] } => {
    const missingCards: CardName[] = []

    // This would need to be imported from your cards utility
    // For now, we'll check if we have 48 mappings
    const isValid = totalMappings.value === 48

    if (!isValid) {
      // Could enumerate specific missing cards if needed
      console.warn(`Only ${totalMappings.value}/48 cards are mapped`)
    }

    return {
      isValid,
      missingCards,
    }
  }

  // Generate final file mappings for upload
  const generateUploadMappings = (): { [key: string]: File } => {
    const uploadMappings: { [key: string]: File } = {}

    for (const [cardName, mapping] of mappings.value.entries()) {
      uploadMappings[cardName] = mapping.file
    }

    return uploadMappings
  }

  // Debug helper
  const debugState = () => {
    console.log('Mapping state:', {
      totalMappings: totalMappings.value,
      mappedFiles: Array.from(mappedFiles.value),
      mappings: Object.fromEntries(mappings.value),
    })
  }

  return {
    // State
    mappings: readonly(mappings),
    mappedFiles: readonly(mappedFiles),
    isDragging: readonly(isDragging),
    draggedFileIndex: readonly(draggedFileIndex),

    // Computed
    totalMappings,
    mappingProgress,
    isComplete,

    // Methods
    isFileMapped,
    isCardMapped,
    getCardMapping,
    getAllMappings,
    addMapping,
    removeMappingByCard,
    removeMappingByFile,
    clearAllMappings,
    startDrag,
    endDrag,
    handleDrop,
    validateComplete,
    generateUploadMappings,
    debugState,
  }
}
