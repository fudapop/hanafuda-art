<template>
  <div class="max-w-4xl p-6 mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">
    <!-- Progress Header with Navigation -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">Map Your Cards</h2>
        <span class="text-sm text-gray-500"> {{ currentCardIndex + 1 }} of {{ totalCards }} </span>
      </div>

      <!-- Progress Navigation Bar -->
      <div class="flex flex-wrap gap-1">
        <button
          v-for="(card, index) in allCards"
          :key="card.name"
          type="button"
          :class="[
            'w-8 h-8 text-xs rounded-md transition-colors flex items-center justify-center',
            {
              'bg-blue-600 text-white': currentCardIndex === index,
              'bg-green-100 text-green-800 hover:bg-green-200':
                isCardMapped(card.name) && currentCardIndex !== index,
              'bg-yellow-100 text-yellow-800 hover:bg-yellow-200':
                isCardSkipped(card.name) && currentCardIndex !== index,
              'bg-gray-100 text-gray-700 hover:bg-gray-200':
                !isCardMapped(card.name) && !isCardSkipped(card.name) && currentCardIndex !== index,
            },
          ]"
          @click="$emit('goToCard', index)"
        >
          {{ index + 1 }}
        </button>
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
        <span class="inline-flex items-center">
          <span class="w-3 h-3 mr-1 bg-green-100 rounded"></span>
          Mapped
        </span>
        <span class="inline-flex items-center">
          <span class="w-3 h-3 mr-1 bg-yellow-100 rounded"></span>
          Skipped
        </span>
        <span class="inline-flex items-center">
          <span class="w-3 h-3 mr-1 bg-gray-100 rounded"></span>
          Unmapped
        </span>
      </div>
    </div>

    <!-- Current Card Display -->
    <div class="grid grid-cols-1 gap-8 mb-8 md:grid-cols-[1fr_2fr]">
      <!-- Card to Map (Left) -->
      <div class="text-center">
        <h3 class="mb-4 text-lg font-medium text-gray-900">Select a file for this card:</h3>
        <div
          class="w-32 h-48 mx-auto overflow-hidden border-2 border-gray-200 rounded-lg bg-gray-50"
        >
          <img
            :src="getCardUrl(currentCard.name, 'flash-black')"
            :alt="currentCard.name"
            class="object-contain w-full h-full"
            draggable="false"
          />
        </div>
        <p class="mt-3 text-sm text-gray-600">
          <strong>{{ formatCardName(currentCard.name) }}</strong>
          <br />
          {{
            Intl.DateTimeFormat(locale, { month: 'long' }).format(
              new Date(0, currentCard.month - 1),
            )
          }}
          • <span class="capitalize">{{ currentCard.flower }}</span> •
          <span class="capitalize">{{ currentCard.type }}</span>
        </p>

        <!-- Clear mapping button for already mapped cards -->
        <div
          v-if="isCurrentCardMapped"
          class="mt-4"
        >
          <button
            type="button"
            class="px-3 py-2 text-sm font-medium text-red-600 transition-colors border border-red-200 rounded-md bg-red-50 hover:bg-red-100"
            @click="clearCurrentMapping"
          >
            Clear Mapping
          </button>
        </div>
      </div>

      <!-- File Selection (Right) -->
      <div>
        <h3 class="mb-2 text-lg font-medium text-gray-900">Choose from your uploaded files:</h3>
        <p class="mb-4 text-sm text-gray-500">
          Only available files are shown. Already mapped files are hidden to reduce clutter.
        </p>
        <div class="grid grid-cols-3 gap-3 overflow-y-auto md:grid-cols-4 lg:grid-cols-5 max-h-80">
          <button
            v-for="(file, index) in availableFiles"
            v-show="shouldShowFile(index)"
            :key="`file-${index}`"
            type="button"
            :class="[
              'relative aspect-[3/5] border-2 rounded-lg overflow-hidden transition-all duration-200',
              {
                'border-gray-200 hover:border-gray-300': !isCurrentCardFile(index),
                'border-green-500 bg-green-50': isCurrentCardFile(index),
              },
            ]"
            @click="selectFile(index)"
          >
            <img
              :src="getFileUrl(file)"
              :alt="`File ${index + 1}`"
              class="object-contain w-full h-full"
              draggable="false"
            />

            <!-- Current card mapping indicator -->
            <div
              v-if="isCurrentCardFile(index)"
              class="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-20"
            >
              <div class="text-center text-green-800">
                <svg
                  class="w-6 h-6 mx-auto mb-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="text-xs font-medium">Current</span>
              </div>
            </div>

            <!-- File info -->
            <div class="absolute bottom-0 left-0 right-0 p-1 text-white bg-black bg-opacity-60">
              <p class="text-xs truncate">File {{ index + 1 }}</p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Navigation Controls -->
    <div class="flex items-center justify-between">
      <button
        type="button"
        :class="[
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          currentCardIndex > 0
            ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            : 'text-gray-400 bg-gray-50 cursor-not-allowed',
        ]"
        :disabled="currentCardIndex === 0"
        @click="$emit('previous')"
      >
        ← Previous
      </button>

      <div class="flex space-x-3">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
          @click="$emit('finish')"
        >
          Review & Upload
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CardName, FlowerCard } from '~/utils/cards'

type Props = {
  currentCard: FlowerCard
  currentCardIndex: number
  totalCards: number
  availableFiles: File[]
  mappedFileIndices: ReadonlySet<number>
  isCurrentCardMapped: boolean
  allCards: any[]
  isCardMapped: (cardName: CardName) => boolean
  isCardSkipped: (cardName: CardName) => boolean
  getCurrentCardMapping: () => any
}

const props = defineProps<Props>()

const { locale } = useI18n()
const { getCardUrl } = useCardDesign()
const { getFileUrl } = useFileUrls() // Use the composable

const emit = defineEmits<{
  selectFile: [cardName: CardName, fileIndex: number]
  previous: []
  next: []
  finish: []
  clearMapping: [cardName: CardName]
  goToCard: [index: number]
}>()

const selectFile = (fileIndex: number): void => {
  emit('selectFile', props.currentCard.name, fileIndex)
  emit('next')
}

// Helper methods
const formatCardName = (cardName: CardName): string => {
  return cardName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const clearCurrentMapping = (): void => {
  emit('clearMapping', props.currentCard.name)
}

// Check if this file should be shown (not mapped to other cards, or mapped to current card)
const shouldShowFile = (fileIndex: number): boolean => {
  // Always show unmapped files
  if (!props.mappedFileIndices.has(fileIndex)) {
    return true
  }

  // Show if it's mapped to the current card
  return isCurrentCardFile(fileIndex)
}

// Check if this file is mapped to the current card
const isCurrentCardFile = (fileIndex: number): boolean => {
  const currentMapping = props.getCurrentCardMapping()
  return currentMapping && currentMapping.fileIndex === fileIndex
}
</script>
