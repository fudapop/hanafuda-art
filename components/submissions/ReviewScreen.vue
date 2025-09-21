<template>
  <div class="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
    <h2 class="mb-6 text-xl font-semibold text-gray-900">Review Your Mappings</h2>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
      <div class="p-4 border border-green-200 rounded-lg bg-green-50">
        <div class="text-2xl font-bold text-green-600">{{ mappings.length }}</div>
        <div class="text-sm text-green-700">Cards Mapped</div>
      </div>

      <div class="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
        <div class="text-2xl font-bold text-yellow-600">{{ skippedCards.length }}</div>
        <div class="text-sm text-yellow-700">Cards Skipped</div>
      </div>

      <div class="p-4 border border-red-200 rounded-lg bg-red-50">
        <div class="text-2xl font-bold text-red-600">{{ unmappedCards.length }}</div>
        <div class="text-sm text-red-700">Cards Remaining</div>
      </div>
    </div>

    <!-- Missing Cards Warning -->
    <div
      v-if="unmappedCards.length > 0"
      class="mb-6"
    >
      <div class="p-4 border border-red-200 rounded-md bg-red-50">
        <div class="flex">
          <svg
            class="w-5 h-5 text-red-400 mt-0.5 mr-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <div>
            <h3 class="text-sm font-medium text-red-800">Cannot upload yet</h3>
            <p class="mt-1 text-sm text-red-700">
              You still have {{ unmappedCards.length }} cards that need to be mapped before you can
              upload your submission.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Skipped Cards -->
    <div
      v-if="skippedCards.length > 0"
      class="mb-6"
    >
      <h3 class="mb-3 text-lg font-medium text-gray-900">Skipped Cards</h3>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="cardName in skippedCards"
          :key="cardName"
          type="button"
          class="p-2 text-sm text-left transition-colors border border-yellow-200 rounded-md bg-yellow-50 hover:bg-yellow-100"
          @click="$emit('editMapping', cardName)"
        >
          {{ formatCardName(cardName) }}
        </button>
      </div>
    </div>

    <!-- Unmapped Cards -->
    <div
      v-if="unmappedCards.length > 0"
      class="mb-6"
    >
      <h3 class="mb-3 text-lg font-medium text-gray-900">Unmapped Cards</h3>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="card in unmappedCards"
          :key="card.name"
          type="button"
          class="p-2 text-sm text-left transition-colors border border-red-200 rounded-md bg-red-50 hover:bg-red-100"
          @click="$emit('editMapping', card.name)"
        >
          {{ formatCardName(card.name) }}
        </button>
      </div>
    </div>

    <!-- Mapped Cards Preview -->
    <div
      v-if="mappings.length > 0"
      class="mb-6"
    >
      <h3 class="mb-3 text-lg font-medium text-gray-900">Mapped Cards</h3>
      <div class="grid grid-cols-4 gap-4 overflow-y-auto md:grid-cols-8 max-h-64">
        <div
          v-for="mapping in mappings"
          :key="mapping.cardName"
          class="flex flex-col items-center p-2 border border-gray-200 rounded-lg"
        >
          <img
            :src="getFileUrl(mapping.file)"
            :alt="mapping.cardName"
            class="object-contain w-20 mb-2 rounded"
          />
          <p class="text-xs text-center text-gray-600 max-w-20">
            {{ formatCardName(mapping.cardName) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-between">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
        @click="$emit('exitReview')"
      >
        ← Continue Mapping
      </button>

      <!-- Upload Status Component -->
      <UploadStatus
        :can-upload="unmappedCards.length === 0"
        :mappings="mappings"
        @upload="$emit('upload')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CardMapping } from '~/composables/useCardMapping'
import type { CardName, FlowerCard } from '~/utils/cards'

type Props = {
  mappings: CardMapping[]
  skippedCards: CardName[]
  unmappedCards: FlowerCard[]
}

defineProps<Props>()

defineEmits<{
  editMapping: [cardName: CardName]
  exitReview: []
  upload: []
}>()

// Helper methods
const formatCardName = (cardName: CardName): string => {
  return cardName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const { getFileUrl } = useFileUrls()
</script>
