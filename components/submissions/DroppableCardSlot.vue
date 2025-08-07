<template>
  <div
    :class="[
      'relative w-[120px] h-[200px] rounded-lg transition-all duration-200 border-2',
      {
        'border-dashed border-gray-300 bg-black/30': !isMapped && !isDragOver,
        'border-dashed border-primary bg-primary/10': !isMapped && isDragOver,
        'border-solid border-green-400 bg-green-50': isMapped,
        'ring-2 ring-primary ring-opacity-50': isDragOver,
      },
    ]"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Reference card (background) -->
    <div class="absolute inset-0">
      <img
        :src="getCardUrl(card.name, 'flash-black')"
        :alt="card.name"
        class="object-cover w-full h-full"
        style="filter: grayscale(50%) opacity(20%)"
        draggable="false"
      />
    </div>

    <!-- Mapped file preview -->
    <div
      v-if="isMapped && mappedFileUrl"
      class="absolute overflow-hidden bg-white rounded-md shadow-md inset-2"
    >
      <img
        :src="mappedFileUrl"
        :alt="`Mapped file for ${card.name}`"
        class="object-contain w-full h-full"
        draggable="false"
      />

      <!-- Remove mapping button -->
      <button
        type="button"
        class="absolute flex items-center justify-center w-6 h-6 text-white transition-colors bg-red-500 rounded-full top-1 right-1 hover:bg-red-600"
        @click="handleRemoveMapping"
        :title="`Remove mapping for ${card.name}`"
      >
        <svg
          class="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>

    <!-- Drop zone indicator -->
    <div
      v-if="!isMapped"
      class="absolute inset-0 flex flex-col items-center justify-center text-white"
    >
      <div
        :class="[
          'w-16 h-16 mb-2 transition-all duration-200 border-2 border-dashed rounded-lg flex items-center justify-center',
          {
            'text-primary border-primary scale-110 bg-primary/10': isDragOver,
            'text-gray-300 border-gray-300': !isDragOver,
          },
        ]"
      >
        <svg
          class="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      <span
        :class="[
          'text-xs text-center transition-all duration-200 px-2',
          {
            'text-primary font-medium': isDragOver,
            'text-gray-300': !isDragOver,
          },
        ]"
      >
        {{ isDragOver ? 'Drop here' : 'Drag file here' }}
      </span>
    </div>

    <!-- Card name label -->
    <div class="absolute bottom-0 left-0 right-0 p-2 text-white bg-black/60">
      <p class="text-xs font-medium text-center truncate">
        {{ formatCardName(card.name) }}
      </p>
    </div>

    <!-- Mapped indicator -->
    <div
      v-if="isMapped"
      class="absolute flex items-center justify-center w-6 h-6 bg-green-500 rounded-full top-2 left-2"
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
  </div>
</template>

<script setup lang="ts">
import type { CardMapping } from '~/composables/useCardMapping'
import type { CardName, FlowerCard } from '~/utils/cards'

type Props = {
  card: FlowerCard
  mapping: CardMapping | null
  isDragActive: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  drop: [cardName: CardName, fileIndex: number]
  removeMapping: [cardName: CardName]
}>()

// Get card design utilities
const { getCardUrl } = useCardDesign()

// Local state for drag interactions
const isDragOver = ref(false)

// Computed properties
const isMapped = computed(() => props.mapping !== null)

const mappedFileUrl = computed(() => {
  if (!props.mapping?.file) return null

  try {
    return URL.createObjectURL(props.mapping.file)
  } catch (error) {
    console.warn('Failed to create object URL for mapped file:', error)
    return null
  }
})

// Format card name for display
const formatCardName = (cardName: CardName): string => {
  return cardName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Drag and drop handlers
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()

  if (isMapped.value || !props.isDragActive) {
    return
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault()

  if (isMapped.value || !props.isDragActive) {
    return
  }

  isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()

  // Only remove drag over state if we're actually leaving the drop zone
  // Check if the related target is not a child element
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX
  const y = event.clientY

  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDragOver.value = false
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false

  if (isMapped.value || !props.isDragActive) {
    return
  }

  const fileIndexStr = event.dataTransfer?.getData('text/plain')
  if (!fileIndexStr) {
    console.warn('No file index found in drop data')
    return
  }

  const fileIndex = parseInt(fileIndexStr, 10)
  if (isNaN(fileIndex)) {
    console.warn('Invalid file index in drop data:', fileIndexStr)
    return
  }

  emit('drop', props.card.name, fileIndex)
}

const handleRemoveMapping = () => {
  if (!isMapped.value) return

  emit('removeMapping', props.card.name)
}

// Cleanup object URL when component unmounts or mapping changes
watch(
  () => props.mapping?.file,
  (newFile, oldFile) => {
    if (oldFile && mappedFileUrl.value) {
      URL.revokeObjectURL(mappedFileUrl.value)
    }
  },
)

onUnmounted(() => {
  if (mappedFileUrl.value) {
    URL.revokeObjectURL(mappedFileUrl.value)
  }
})
</script>
