<template>
  <Modal
    :open="isAnnouncementModalOpen"
    class="announcement-modal"
  >
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-x-2">
          <div
            class="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500"
          >
            <Icon
              name="heroicons:megaphone"
              class="w-4 h-4 text-white"
            />
          </div>
          <h1 class="text-xl">What's New in Hanafuda Koi-Koi!</h1>
        </div>
        <div
          v-if="newAnnouncements.length > 1"
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
        >
          <span>{{ currentPage + 1 }} of {{ newAnnouncements.length }}</span>
        </div>
      </div>
    </template>

    <template #description>
      <div
        class="text-left"
        ref="containerRef"
      >
        <!-- Current announcement -->
        <div
          v-if="currentAnnouncement"
          class="text-sm text-gray-600 dark:text-gray-300"
        >
          <!-- Use ContentRenderer for markdown body if available -->
          <section
            v-if="currentAnnouncement.body"
            ref="currentPageRef"
            :class="{
              'mx-0 prose-sm prose text-left max-w-none dark:prose-invert': true,
              'transition-all duration-200 ease-linear': !isSwiping,
            }"
            :style="{ left, opacity }"
          >
            <ContentRenderer
              :value="currentAnnouncement"
              :components="{
                h1: 'h3',
                h2: 'h4',
                h3: 'h5',
              }"
            />
          </section>
          <!-- Fallback to structured data display -->
          <section
            v-else
            class="text-left"
          >
            <div class="pl-3 border-l-2 border-orange-400">
              <h4 class="font-semibold text-left text-gray-900 dark:text-white">
                {{ currentAnnouncement.title }}
              </h4>
              <p class="mb-2 text-xs text-left text-gray-500 dark:text-gray-400">
                {{ currentAnnouncement.date }}
              </p>
              <p class="mb-3 text-sm text-left">{{ currentAnnouncement.description }}</p>
              <ul
                v-if="currentAnnouncement.features?.length"
                class="space-y-1 text-left list-disc list-inside"
              >
                <li
                  v-for="feature in currentAnnouncement.features"
                  :key="feature"
                  class="text-xs text-left"
                >
                  {{ feature }}
                </li>
              </ul>
            </div>
          </section>
        </div>

        <!-- Pagination controls -->
        <div
          v-if="newAnnouncements.length > 1"
          class="flex items-center justify-between pt-4 mt-6 border-t border-gray-200 dark:border-gray-600"
        >
          <button
            type="button"
            :disabled="currentPage === 0"
            :class="[
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
              currentPage === 0
                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
            ]"
            @click="previousAnnouncement"
          >
            <Icon
              name="heroicons:chevron-left"
              class="w-4 h-4"
            />
            Previous
          </button>

          <!-- Page indicators -->
          <div class="flex gap-2">
            <button
              v-for="(announcement, index) in newAnnouncements"
              :key="announcement.id"
              type="button"
              :class="[
                'w-2 h-2 rounded-full transition-colors',
                index === currentPage
                  ? 'bg-orange-500'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500',
              ]"
              @click="currentPage = index"
            />
          </div>

          <button
            type="button"
            :disabled="currentPage === newAnnouncements.length - 1"
            :class="[
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
              currentPage === newAnnouncements.length - 1
                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
            ]"
            @click="nextAnnouncement"
          >
            Next
            <Icon
              name="heroicons:chevron-right"
              class="w-4 h-4"
            />
          </button>
        </div>
      </div>
    </template>

    <template #actions>
      <div class="flex flex-col gap-3 mt-5 sm:mt-6 sm:flex-row">
        <button
          type="button"
          class="inline-flex justify-center w-full px-3 py-2 text-sm font-semibold text-gray-900 bg-white rounded-md shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-600"
          @click="handleDontShowAgain"
        >
          Don't show again
        </button>
        <button
          type="button"
          class="inline-flex justify-center w-full px-3 py-2 text-sm font-semibold text-white bg-orange-600 rounded-md shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          @click="handleDismiss"
        >
          Got it!
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { usePointerSwipe, type UseSwipeDirection } from '@vueuse/core'
import { useAnnouncements } from '~/composables/useAnnouncements'

// Use the announcements composable directly
const {
  newAnnouncements,
  isAnnouncementModalOpen,
  checkAndShowAnnouncements,
  dismissAnnouncements,
  dontShowAnnouncementsAgain,
} = await useAnnouncements()

// Pagination state
const currentPage = ref(0)
const container = shallowRef<HTMLElement | null>(null)

const containerWidth = computed(() => container.value?.offsetWidth)

const left = shallowRef('0')
const opacity = shallowRef(1)

function reset() {
  left.value = '0'
  opacity.value = 1
}

const currentPageRef = useTemplateRef('currentPageRef')
const { isSwiping, distanceX } = usePointerSwipe(currentPageRef, {
  disableTextSelect: true,
  onSwipe(e: PointerEvent) {
    if (containerWidth.value) {
      if (distanceX.value < 0) {
        const distance = Math.abs(distanceX.value)
        left.value = `${distance}px`
        opacity.value = 1.25 - distance / containerWidth.value
      } else {
        left.value = '0'
        opacity.value = 1
      }
    }
  },
  onSwipeEnd(e: PointerEvent, direction: UseSwipeDirection) {
    if (
      distanceX.value < 0 &&
      containerWidth.value &&
      Math.abs(distanceX.value) / containerWidth.value >= 0.5
    ) {
      left.value = '100%'
      opacity.value = 0
    } else {
      left.value = '0'
      opacity.value = 1
    }
  },
})

// Current announcement computed property
const currentAnnouncement = computed(() => {
  return newAnnouncements.value[currentPage.value]
})

// Navigation methods
const nextAnnouncement = () => {
  if (currentPage.value < newAnnouncements.value.length - 1) {
    currentPage.value++
  }
}

const previousAnnouncement = () => {
  if (currentPage.value > 0) {
    currentPage.value--
  }
}

// Reset pagination when modal opens
watch(
  () => isAnnouncementModalOpen.value,
  (isOpen) => {
    if (isOpen) {
      currentPage.value = 0
    }
  },
)

// Keyboard navigation
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    if (!isAnnouncementModalOpen.value) return

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      previousAnnouncement()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      nextAnnouncement()
    }
  }

  document.addEventListener('keydown', handleKeydown)

  checkAndShowAnnouncements()

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})

const handleDismiss = () => {
  dismissAnnouncements()
}

const handleDontShowAgain = () => {
  dontShowAnnouncementsAgain()
}
</script>

<style scoped>
:deep(.announcement-modal) {
  /* Override the modal max-width for announcements */
  .sm\:max-w-lg {
    max-width: 42rem; /* sm:max-w-2xl equivalent */
  }

  /* Override text centering */
  .text-center {
    text-align: left;
  }

  /* Ensure prose content is left aligned */
  .prose {
    text-align: left;
  }

  .prose h1,
  .prose h2,
  .prose h3,
  .prose h4,
  .prose h5,
  .prose h6 {
    text-align: left;
    font-weight: 600;
  }

  .prose p,
  .prose li {
    text-align: left;
  }

  .prose ul {
    text-align: left;
  }
}
</style>
