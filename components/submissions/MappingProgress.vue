<template>
  <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
    <!-- Progress Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900">Card Mapping Progress</h3>
      <div class="flex items-center space-x-2">
        <button
          v-if="mappedCount > 0"
          type="button"
          class="text-sm text-red-600 transition-colors hover:text-red-800"
          @click="handleClearAll"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-700">
          {{ mappedCount }} of {{ totalCards }} cards mapped
        </span>
        <span class="text-sm text-gray-500"> {{ progressPercentage }}% </span>
      </div>

      <div class="w-full h-3 bg-gray-200 rounded-full">
        <div
          :class="[
            'h-3 rounded-full transition-all duration-300 ease-out',
            {
              'bg-green-500': isComplete,
              'bg-blue-500': !isComplete && mappedCount > 0,
              'bg-gray-300': mappedCount === 0,
            },
          ]"
          :style="{ width: `${progressPercentage}%` }"
        />
      </div>
    </div>

    <!-- Status Message -->
    <div class="mb-4">
      <div
        v-if="isComplete"
        class="flex items-center p-3 text-green-700 rounded-md bg-green-50"
      >
        <svg
          class="w-5 h-5 mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="font-medium">All cards mapped! Ready to upload.</span>
      </div>

      <div
        v-else-if="mappedCount > 0"
        class="flex items-center p-3 text-blue-700 rounded-md bg-blue-50"
      >
        <svg
          class="w-5 h-5 mr-2"
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
        <span>
          {{ remainingCount }} more {{ remainingCount === 1 ? 'card' : 'cards' }} to map.
        </span>
      </div>

      <div
        v-else
        class="flex items-center p-3 text-gray-600 rounded-md bg-gray-50"
      >
        <svg
          class="w-5 h-5 mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
            clip-rule="evenodd"
          />
        </svg>
        <span>Drag files from the left to map them to cards on the right.</span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex space-x-3">
      <button
        v-if="isComplete"
        type="button"
        class="flex-1 px-4 py-2 font-medium text-white transition-colors bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        @click="handleUpload"
      >
        Upload Mapped Cards
      </button>

      <button
        v-else
        type="button"
        class="flex-1 px-4 py-2 font-medium text-gray-500 bg-gray-300 rounded-md cursor-not-allowed"
        disabled
      >
        Upload Mapped Cards
      </button>

      <!-- Debug button (only in development) -->
      <button
        v-if="showDebug"
        type="button"
        class="px-4 py-2 text-sm text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
        @click="handleDebug"
      >
        Debug
      </button>
    </div>

    <!-- Quick Stats (collapsible) -->
    <div
      v-if="mappedCount > 0"
      class="pt-4 mt-4 border-t border-gray-200"
    >
      <button
        type="button"
        class="flex items-center justify-between w-full text-sm text-left text-gray-600 transition-colors hover:text-gray-800"
        @click="showStats = !showStats"
      >
        <span>Mapping Details</span>
        <svg
          :class="['w-4 h-4 transition-transform duration-200', { 'rotate-180': showStats }]"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      <div
        v-if="showStats"
        class="mt-3 space-y-1 text-sm text-gray-600"
      >
        <div class="flex justify-between">
          <span>Bright cards:</span>
          <span>{{ cardTypeStats.bright }}/5</span>
        </div>
        <div class="flex justify-between">
          <span>Animal cards:</span>
          <span>{{ cardTypeStats.animal }}/9</span>
        </div>
        <div class="flex justify-between">
          <span>Ribbon cards:</span>
          <span>{{ cardTypeStats.ribbon }}/10</span>
        </div>
        <div class="flex justify-between">
          <span>Plain cards:</span>
          <span>{{ cardTypeStats.plain }}/24</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CardMapping } from '~/composables/useCardMapping'

type Props = {
  mappedCount: number
  totalCards: number
  progressPercentage: number
  isComplete: boolean
  mappings: CardMapping[]
  showDebug?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDebug: false,
})

const emit = defineEmits<{
  clearAll: []
  upload: [mappings: CardMapping[]]
  debug: []
}>()

// Local state
const showStats = ref(false)

// Computed properties
const remainingCount = computed(() => props.totalCards - props.mappedCount)

const cardTypeStats = computed(() => {
  const stats = {
    bright: 0,
    animal: 0,
    ribbon: 0,
    plain: 0,
  }

  // This would need access to the CARDS data to determine card types
  // For now, we'll use placeholder logic
  props.mappings.forEach((mapping) => {
    // You would check the card type from the CARDS data structure
    // For demonstration purposes, we'll use simple logic based on card name
    const cardName = mapping.cardName
    if (
      cardName.includes('tsuru') ||
      cardName.includes('maku') ||
      cardName.includes('tsuki') ||
      cardName.includes('sakazuki') ||
      cardName.includes('ho-oh')
    ) {
      stats.bright++
    } else if (
      cardName.includes('uguisu') ||
      cardName.includes('yatsuhashi') ||
      cardName.includes('inoshishi') ||
      cardName.includes('chou') ||
      cardName.includes('kakku') ||
      cardName.includes('kari') ||
      cardName.includes('shika') ||
      cardName.includes('toufuu') ||
      cardName.includes('tsubame')
    ) {
      stats.animal++
    } else if (cardName.includes('tan')) {
      stats.ribbon++
    } else {
      stats.plain++
    }
  })

  return stats
})

// Event handlers
const handleClearAll = () => {
  if (confirm('Are you sure you want to clear all mappings? This action cannot be undone.')) {
    emit('clearAll')
  }
}

const handleUpload = () => {
  if (!props.isComplete) {
    return
  }

  emit('upload', props.mappings)
}

const handleDebug = () => {
  emit('debug')
}
</script>
