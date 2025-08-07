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

      <!-- Mapping Progress (only show when we have files) -->
      <div
        v-if="submissionFiles.length > 0"
        class="mb-8"
      >
        <MappingProgress
          :mapped-count="mappingProgress.mapped"
          :total-cards="mappingProgress.total"
          :progress-percentage="mappingProgress.percentage"
          :is-complete="isComplete"
          :mappings="getAllMappings()"
          :show-debug="isDev"
          @clear-all="handleClearAllMappings"
          @upload="handleUploadMappings"
          @debug="debugMappingState"
        />
      </div>

      <!-- Instructions -->
      <div
        v-if="submissionFiles.length > 0"
        class="mb-6"
      >
        <div class="p-4 border border-blue-200 rounded-md bg-blue-50">
          <div class="flex">
            <svg
              class="w-5 h-5 text-blue-400 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <div>
              <h3 class="text-sm font-medium text-blue-800">How to map your cards:</h3>
              <p class="mt-1 text-sm text-blue-700">
                Drag files from the left panel and drop them onto the corresponding hanafuda cards
                on the right. Each card must be mapped before you can upload your submission.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Mapping Interface -->
      <div
        v-if="submissionType === 'deck' && submissionFiles.length > 0"
        class="grid min-h-0 grid-cols-2 gap-8"
      >
        <!-- Submitted Files (Left Side) -->
        <section
          class="flex flex-col min-w-0 p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h2 class="mb-4 text-lg font-semibold text-gray-900">
            Your Submitted Files ({{ submissionFiles.length }})
          </h2>
          <div class="grid grid-cols-4 gap-3 max-h-[600px] overflow-y-auto flex-1">
            <DraggableFileCard
              v-for="(file, index) in submissionFiles"
              :key="`file-${index}`"
              :file="file"
              :file-index="index"
              :is-mapped="isFileMapped(index)"
              :show-file-info="true"
              @drag-start="startDrag"
              @drag-end="endDrag"
            />
          </div>
        </section>

        <!-- Hanafuda Cards (Right Side) -->
        <section
          class="flex flex-col min-w-0 p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h2 class="mb-4 text-lg font-semibold text-gray-900">
            Hanafuda Cards ({{ cardObjects.length }})
          </h2>
          <div class="grid grid-cols-4 gap-3 max-h-[600px] overflow-y-auto flex-1">
            <DroppableCardSlot
              v-for="card in cardObjects"
              :key="card.name"
              :card="card"
              :mapping="getCardMapping(card.name)"
              :is-drag-active="isDragging"
              @drop="handleCardDrop"
              @remove-mapping="handleRemoveMapping"
            />
          </div>
        </section>
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
import { CARDS } from '~/utils/cards'

definePageMeta({
  requiresAuth: true,
  middleware: ['auth'],
})

// Import our new components
import DraggableFileCard from '~/components/submissions/DraggableFileCard.vue'
import DroppableCardSlot from '~/components/submissions/DroppableCardSlot.vue'
import MappingProgress from '~/components/submissions/MappingProgress.vue'

// Submission state
const submissionType = ref<'deck' | 'single'>('deck')
const submissionFiles = ref<File[]>([])

// Drag and drop mapping functionality
const {
  mappingProgress,
  isComplete,
  isDragging,
  isFileMapped,
  isCardMapped,
  getCardMapping,
  getAllMappings,
  startDrag,
  endDrag,
  handleDrop,
  removeMappingByCard,
  clearAllMappings,
  generateUploadMappings,
  debugState,
} = useCardMapping()

// Other composables
const { getCardUrl } = useCardDesign()

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

// Drag and drop handlers
const handleCardDrop = (cardName: CardName, fileIndex: number) => {
  const file = submissionFiles.value[fileIndex]
  if (!file) {
    console.error(`No file found at index ${fileIndex}`)
    return
  }

  const success = handleDrop(cardName, submissionFiles.value)
  if (success) {
    console.log(`Successfully mapped file ${fileIndex} to card ${cardName}`)
  } else {
    console.warn(`Failed to map file ${fileIndex} to card ${cardName}`)
  }
}

const handleRemoveMapping = (cardName: CardName) => {
  const success = removeMappingByCard(cardName)
  if (success) {
    console.log(`Removed mapping for card ${cardName}`)
  }
}

const handleClearAllMappings = () => {
  clearAllMappings()
  console.log('Cleared all mappings')
}

const handleUploadMappings = () => {
  if (!isComplete.value) {
    console.warn('Cannot upload - mapping is not complete')
    return
  }

  const uploadMappings = generateUploadMappings()
  console.log('Generated upload mappings:', uploadMappings)

  // Here you would implement the actual upload logic
  // For now, we'll just log the mappings
  alert(`Ready to upload ${Object.keys(uploadMappings).length} mapped cards!`)
}

const debugMappingState = () => {
  debugState()
}

// Create array of card objects for template
const cardObjects = computed(() => {
  return Object.values(CARDS)
})
</script>

<style scoped>
/* Enhanced drag and drop visual feedback */
.drag-preview {
  opacity: 0.8;
  transform: rotate(5deg);
  border: 2px dashed #3b82f6;
}

.drop-zone-active {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

/* Smooth transitions for card states */
.card-transition {
  transition: all 0.2s ease-in-out;
}

.card-mapped {
  transform: scale(0.98);
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.2);
}

.card-dragging {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  z-index: 50;
}

/* File upload styling enhancement */
input[type='file']::-webkit-file-upload-button {
  transition: all 0.2s ease-in-out;
}

input[type='file']:hover::-webkit-file-upload-button {
  transform: translateY(-1px);
}

/* Progress bar animation */
.progress-bar {
  transition: width 0.3s ease-in-out;
}

/* Loading states */
.loading-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Dark mode support for drag states */
@media (prefers-color-scheme: dark) {
  .drop-zone-active {
    border-color: #60a5fa;
    background-color: rgba(59, 130, 246, 0.1);
  }
}
</style>
