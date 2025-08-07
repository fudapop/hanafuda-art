<template>
  <div
    :class="[
      'relative w-[120px] h-[200px] border border-gray-200 rounded-lg overflow-hidden cursor-move transition-all duration-200',
      {
        'opacity-50 cursor-not-allowed': isMapped,
        'hover:border-primary hover:shadow-md': !isMapped,
        'ring-2 ring-primary ring-opacity-50': isDragging,
      },
    ]"
    :draggable="!isMapped"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <!-- File preview -->
    <div class="flex items-center justify-center w-full h-full p-2">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="`Submitted file ${fileIndex + 1}`"
        class="max-w-[100px] h-auto object-contain"
        draggable="false"
      />
      <div
        v-else
        class="flex flex-col items-center justify-center text-gray-400"
      >
        <div class="w-8 h-8 mb-2 opacity-50">
          <svg
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <span class="text-xs">File {{ fileIndex + 1 }}</span>
      </div>
    </div>

    <!-- Mapped indicator -->
    <div
      v-if="isMapped"
      class="absolute flex items-center justify-center w-6 h-6 bg-green-500 rounded-full top-2 right-2"
    >
      <svg
        class="w-4 h-4 text-white"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clip-rule="evenodd"
        />
      </svg>
    </div>

    <!-- Drag instruction (only when draggable) -->
    <div
      v-if="!isMapped"
      class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent"
    >
      <p class="text-xs text-center text-white">Drag to map</p>
    </div>

    <!-- File info overlay -->
    <div
      v-if="showFileInfo"
      class="absolute top-0 left-0 right-0 p-1 text-white bg-black/60"
    >
      <p class="text-xs truncate">
        {{ file?.name || `File ${fileIndex + 1}` }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
type Props = {
  file: File | null
  fileIndex: number
  isMapped: boolean
  showFileInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showFileInfo: false,
})

const emit = defineEmits<{
  dragStart: [fileIndex: number]
  dragEnd: []
}>()

// Generate image URL for preview
const imageUrl = computed(() => {
  if (!props.file) return null

  try {
    return URL.createObjectURL(props.file)
  } catch (error) {
    console.warn('Failed to create object URL for file:', error)
    return null
  }
})

// Track dragging state for this specific card
const isDragging = ref(false)

const handleDragStart = (event: DragEvent) => {
  if (props.isMapped) {
    event.preventDefault()
    return
  }

  isDragging.value = true

  // Set drag data
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', props.fileIndex.toString())

    // Create custom drag image if we have a file
    if (imageUrl.value) {
      const img = new Image()
      img.src = imageUrl.value
      event.dataTransfer.setDragImage(img, 50, 50)
    }
  }

  emit('dragStart', props.fileIndex)
}

const handleDragEnd = () => {
  isDragging.value = false
  emit('dragEnd')
}

// Cleanup object URL when component unmounts
onUnmounted(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
})
</script>
