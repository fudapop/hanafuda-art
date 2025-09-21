<template>
  <div class="flex items-center space-x-2">
    <!-- Upload Button -->
    <button
      v-if="!hasActiveUploads && !isUploading"
      type="button"
      class="px-6 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!canUpload"
      @click="handleUpload"
    >
      <Icon
        name="lucide:upload"
        class="w-4 h-4 mr-2"
      />
      Upload All Cards
    </button>

    <!-- Uploading State -->
    <div
      v-else-if="isUploading"
      class="flex items-center space-x-2"
    >
      <Icon
        name="lucide:loader-2"
        class="w-4 h-4 text-blue-500 animate-spin"
      />
      <span class="text-sm text-gray-600">
        Uploading {{ completedCount }}/{{ totalFiles }} files...
      </span>
      <button
        type="button"
        class="text-xs text-red-600 hover:text-red-800"
        @click="cancelUploads"
      >
        Cancel
      </button>
    </div>

    <!-- Upload Complete -->
    <div
      v-else-if="isComplete && !hasActiveUploads"
      class="flex items-center space-x-2"
    >
      <Icon
        name="lucide:check-circle"
        class="w-4 h-4 text-green-500"
      />
      <span class="text-sm text-green-600"> Upload Complete! ({{ completedCount }} files) </span>
      <button
        type="button"
        class="text-xs text-gray-600 hover:text-gray-800"
        @click="clearCompleted"
      >
        Clear
      </button>
    </div>

    <!-- Upload Failed -->
    <div
      v-else-if="failedCount > 0 && !hasActiveUploads"
      class="flex items-center space-x-2"
    >
      <Icon
        name="lucide:alert-circle"
        class="w-4 h-4 text-red-500"
      />
      <span class="text-sm text-red-600"> Upload Failed ({{ failedCount }} files) </span>
      <button
        type="button"
        class="text-xs text-red-600 hover:text-red-800"
        @click="retryFailed"
      >
        Retry
      </button>
    </div>

    <!-- Progress Bar (when uploading) -->
    <div
      v-if="isUploading"
      class="flex-1 max-w-xs"
    >
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-blue-500 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${uploadProgress}%` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  canUpload: boolean
  mappings: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  upload: []
}>()

const {
  isProcessing,
  completedCount,
  failedCount,
  uploadProgress,
  cancelUploads,
  clearCompleted,
  uploadCardMappings,
} = useFileUploadManager()

// Computed properties
const isUploading = computed(() => isProcessing.value)
const hasActiveUploads = computed(() => isProcessing.value)
const isComplete = computed(() => completedCount.value > 0 && !isProcessing.value)
const totalFiles = computed(() => props.mappings.length)

// Methods
const handleUpload = () => {
  if (props.canUpload && props.mappings.length > 0) {
    uploadCardMappings(props.mappings)
    emit('upload')
  }
}

const retryFailed = () => {
  // TODO: Implement retry logic
  console.log('Retrying failed uploads...')
}
</script>
