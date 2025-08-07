<template>
  <div class="min-h-screen py-8 bg-gray-50">
    <div class="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="mb-4 text-3xl font-bold text-gray-900">Card Submissions</h1>

        <!-- Submission Type Toggle -->
        <div class="flex mb-6 space-x-4">
          <button
            :class="[
              'px-4 py-2 rounded-md font-medium transition-colors',
              submissionType === 'deck'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
            ]"
            @click="submissionType = 'deck'"
          >
            Full Deck (48 cards)
          </button>
          <button
            :class="[
              'px-4 py-2 rounded-md font-medium transition-colors',
              submissionType === 'single'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
            ]"
            @click="submissionType = 'single'"
          >
            Single Card
          </button>
        </div>

        <!-- File Upload -->
        <div
          v-if="submissionType === 'deck'"
          class="mb-6"
        >
          <label class="block mb-2 text-sm font-medium text-gray-700">
            Upload Card Images (48 files required)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
            @change="handleFileChange"
          />
          <p class="mt-2 text-sm text-gray-500">
            Select all 48 card images at once. Supported formats: JPG, PNG, WebP
          </p>
        </div>
      </div>

      <!-- Sequential Mapping Interface -->
      <div v-if="submissionType === 'deck' && submissionFiles.length > 0">
        <!-- Overall Progress -->
        <!-- <div class="mb-8">
          <MappingProgress
            :mapped-count="mappingProgress.mapped"
            :total-cards="mappingProgress.total"
            :progress-percentage="mappingProgress.percentage"
            :is-complete="isComplete"
            :mappings="getAllMappings()"
            :show-debug="isDev"
            @clear-all="handleClearAllMappings"
            @upload="handleUploadMappings"
            @debug="debugState"
          />
        </div> -->

        <!-- Review Mode -->
        <div
          v-if="isInReviewMode"
          class="mb-8"
        >
          <ReviewScreen
            :mappings="getAllMappings()"
            :skipped-cards="Array.from(skippedCards)"
            :unmapped-cards="unmappedCards"
            @edit-mapping="editMapping"
            @exit-review="exitReviewMode"
            @upload="handleUploadMappings"
          />
        </div>

        <!-- Sequential Card Selector -->
        <div v-else>
          <CardSelector
            :current-card="currentCard"
            :current-card-index="currentCardIndex"
            :total-cards="totalCards"
            :available-files="submissionFiles"
            :mapped-file-indices="mappedFiles"
            :is-current-card-mapped="isCurrentCardMapped"
            :all-cards="allCards"
            :is-card-mapped="isCardMapped"
            :is-card-skipped="isCardSkipped"
            :get-current-card-mapping="() => getCardMapping(currentCard?.name)"
            @select-file="handleSelectFile"
            @previous="goToPrevious"
            @next="handleNext"
            @finish="handleFinish"
            @clear-mapping="handleClearMapping"
            @go-to-card="goToCard"
          />
        </div>
      </div>

      <!-- Single Card Mode -->
      <div v-if="submissionType === 'single'">
        <div class="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 class="mb-4 text-lg font-semibold text-gray-900">Single Card Submission</h2>
          <p class="text-gray-600">Single card submission feature coming soon...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="submissionType === 'deck' && submissionFiles.length === 0"
        class="py-12 text-center"
      >
        <svg
          class="w-12 h-12 mx-auto text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No files uploaded</h3>
        <p class="mt-1 text-sm text-gray-500">Upload 48 card images to begin mapping.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CardName } from '~/utils/cards'

definePageMeta({
  requiresAuth: true,
  middleware: ['auth'],
})

// Import components
import CardSelector from '~/components/submissions/CardSelector.vue'

// Submission state
const submissionType = ref<'deck' | 'single'>('deck')
const submissionFiles = ref<File[]>([])

// Sequential card mapping functionality
const {
  // Sequential state
  currentCardIndex,
  currentCard,
  totalCards,
  skippedCards,
  isInReviewMode,
  allCards,

  // Navigation
  goToNext,
  goToPrevious,
  goToCard,
  goToFirstUnmapped,
  goToNextUnmapped,

  // Mapping
  mapCurrentCard,

  // Review
  enterReviewMode,
  exitReviewMode,

  // Status
  getCompletionStatus,
  unmappedCards,
  isCardSkipped,

  // Base mapping functionality
  mappingProgress,
  isComplete,
  mappedFiles,
  isCardMapped,
  isCurrentCardMapped,
  getCardMapping,
  getAllMappings,
  clearAllMappings,
  removeMappingByCard,
  generateUploadMappings,
  debugState,
} = useSequentialCardMapping()

// Development mode check
const isDev = process.dev

// Event handlers
const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files

  if (!files) return

  // Clear existing files and start fresh
  submissionFiles.value = []
  clearAllMappings()

  // Add files to array
  for (let i = 0; i < files.length; i++) {
    submissionFiles.value.push(files[i])
  }

  nextTick(() => {
    console.log(`Loaded ${submissionFiles.value.length} files`)
  })
}

const handleSelectFile = (cardName: CardName, fileIndex: number) => {
  const file = submissionFiles.value[fileIndex]
  if (!file) {
    console.error(`No file found at index ${fileIndex}`)
    return
  }

  const success = mapCurrentCard(fileIndex, file)
  if (success) {
    console.log(`Successfully mapped file ${fileIndex} to card ${cardName}`)

    // Check if all cards are now mapped and auto-trigger review
    nextTick(() => {
      const status = getCompletionStatus()
      if (status.canUpload) {
        console.log('All cards mapped! Entering review mode...')
        enterReviewMode()
      }
    })
  } else {
    console.warn(`Failed to map file ${fileIndex} to card ${cardName}`)
  }
}

const handleNext = () => {
  // Try to go to next unmapped card first
  if (!goToNextUnmapped()) {
    // If no unmapped cards, just go to next card
    goToNext()
  }
}

const handleFinish = () => {
  // Always enter review mode when finish is clicked
  enterReviewMode()
}

const handleClearAllMappings = () => {
  clearAllMappings()
  console.log('Cleared all mappings')
}

const handleUploadMappings = () => {
  const status = getCompletionStatus()

  if (!status.canUpload) {
    console.warn('Cannot upload - mapping is not complete')
    return
  }

  const uploadMappings = generateUploadMappings()
  console.log('Generated upload mappings:', uploadMappings)

  // Here you would implement the actual upload logic
  alert(`Ready to upload ${Object.keys(uploadMappings).length} mapped cards!`)
}

const handleClearMapping = (cardName: CardName) => {
  // Remove the mapping for this card
  const success = removeMappingByCard(cardName)
  if (success) {
    console.log(`Cleared mapping for card ${cardName}`)
  }
}

const editMapping = (cardName: CardName) => {
  // Find the card index and navigate to it
  const cardIndex = allCards.value.findIndex((card: any) => card.name === cardName)
  if (cardIndex !== -1) {
    goToCard(cardIndex)
    exitReviewMode()
  }
}
</script>
