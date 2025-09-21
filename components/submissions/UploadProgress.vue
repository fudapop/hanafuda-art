<template>
  <div
    v-if="hasActiveUploads"
    class="fixed bottom-4 right-4 z-50 w-80"
  >
    <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-gray-900">Uploading Files</h3>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600"
          @click="cancelUploads"
        >
          <Icon
            name="lucide:x"
            class="w-4 h-4"
          />
        </button>
      </div>

      <!-- Overall Progress -->
      <div class="mb-4">
        <div class="flex justify-between text-xs text-gray-600 mb-1">
          <span>{{ completedCount }} of {{ totalFiles }} completed</span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-blue-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${uploadProgress}%` }"
          />
        </div>
      </div>

      <!-- Individual File Progress -->
      <div class="space-y-2 max-h-48 overflow-y-auto">
        <div
          v-for="item in queueItems"
          :key="item.id"
          class="flex items-center space-x-3 py-2"
        >
          <!-- Status Icon -->
          <div class="flex-shrink-0 w-5">
            <Icon
              v-if="item.status === 'uploading'"
              name="lucide:loader-2"
              class="w-4 h-4 text-blue-500 animate-spin"
            />
            <Icon
              v-else-if="item.status === 'completed'"
              name="lucide:check"
              class="w-4 h-4 text-green-500"
            />
            <Icon
              v-else-if="item.status === 'failed'"
              name="lucide:x"
              class="w-4 h-4 text-red-500"
            />
            <Icon
              v-else-if="item.status === 'cancelled'"
              name="lucide:minus"
              class="w-4 h-4 text-gray-400"
            />
            <div
              v-else
              class="w-4 h-4 rounded-full border-2 border-gray-300"
            />
          </div>

          <!-- File Info -->
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-gray-900 truncate">
              {{ formatCardName(item.cardName) }}
            </p>
            <div class="flex items-center space-x-2">
              <!-- Progress Bar for Active Uploads -->
              <div
                v-if="item.status === 'uploading'"
                class="flex-1 bg-gray-200 rounded-full h-1"
              >
                <div
                  class="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  :style="{ width: `${item.progress}%` }"
                />
              </div>

              <!-- Status Text -->
              <span
                v-else
                class="text-xs"
                :class="{
                  'text-green-600': item.status === 'completed',
                  'text-red-600': item.status === 'failed',
                  'text-gray-500': item.status === 'cancelled',
                  'text-gray-400': item.status === 'pending',
                }"
              >
                {{ getStatusText(item.status) }}
              </span>
            </div>
          </div>

          <!-- Progress Percentage -->
          <div
            v-if="item.status === 'uploading'"
            class="text-xs text-gray-500 w-8 text-right"
          >
            {{ item.progress }}%
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div
        v-if="!isProcessing && (completedCount > 0 || failedCount > 0)"
        class="flex justify-between mt-4 pt-3 border-t border-gray-200"
      >
        <button
          v-if="completedCount > 0"
          type="button"
          class="text-xs text-gray-600 hover:text-gray-800"
          @click="clearCompleted"
        >
          Clear Completed
        </button>

        <button
          v-if="failedCount > 0"
          type="button"
          class="text-xs text-red-600 hover:text-red-800"
          @click="retryFailed"
        >
          Retry Failed ({{ failedCount }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadItem } from '~/composables/useFileUploadManager'

const {
  queue,
  isProcessing,
  completedCount,
  failedCount,
  uploadProgress,
  cancelUploads,
  clearCompleted,
} = useFileUploadManager()

// Computed properties
const queueItems = computed(() => Array.from(queue.value.values()))
const totalFiles = computed(() => queueItems.value.length)
const hasActiveUploads = computed(() => queueItems.value.length > 0)

// Helper functions
const formatCardName = (cardName: string): string => {
  return cardName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const getStatusText = (status: UploadItem['status']): string => {
  switch (status) {
    case 'pending':
      return 'Waiting...'
    case 'uploading':
      return 'Uploading...'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Unknown'
  }
}

const retryFailed = () => {
  // TODO: Implement retry logic for failed uploads
  console.log('Retrying failed uploads...')
}
</script>
