<template>
  <Modal
    :open="isAnnouncementModalOpen"
    class="announcement-modal"
  >
    <template #title>
      <div class="flex flex-col items-center justify-between sm:flex-row">
        <div class="flex items-center gap-x-2">
          <div
            aria-hidden
            class="items-center hidden w-8 h-8 mx-auto rounded-full sm:justify-center sm:flex bg-gradient-to-br from-yellow-400 to-orange-500"
          >
            <Icon
              name="heroicons:megaphone"
              class="w-4 h-4 text-white"
            />
          </div>
          <h1 class="text-lg sm:text-xl">What's New in Hanafuda Koi-Koi!</h1>
        </div>
        <div
          v-if="newAnnouncements.length > 1"
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
        >
          <span class="text-sm sm:text-base"
            >{{ currentPage + 1 }} of {{ newAnnouncements.length }}</span
          >
        </div>
      </div>
    </template>

    <template #description>
      <div class="text-left">
        <!-- Current announcement -->
        <div
          v-if="currentAnnouncement"
          class="text-sm text-gray-600 dark:text-gray-300"
        >
          <!-- Use ContentRenderer for markdown body if available -->
          <section
            v-if="currentAnnouncement.body"
            class="mx-0 prose-sm prose text-left max-w-none dark:prose-invert"
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

        <!-- Impression tracking -->
        <div
          v-if="currentAnnouncement"
          class="flex items-center justify-between pt-3 mt-3"
        >
          <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span
              v-if="isDev"
              class="flex items-center gap-1"
            >
              <Icon
                name="heroicons:eye"
                class="w-4 h-4"
              />
              {{ impressions[currentAnnouncement.id]?.views || 0 }}
              <span class="sr-only">views</span>
            </span>
            <span
              v-if="isDev"
              class="flex items-center gap-1"
            >
              <Icon
                name="heroicons:heart"
                class="w-4 h-4"
              />
              {{ impressions[currentAnnouncement.id]?.likes || 0 }}
              <span class="sr-only"> likes </span>
            </span>
          </div>

          <button
            type="button"
            :class="[
              'flex items-center gap-2 px-2 py-1 text-sm rounded-md transition-colors',
              isLiked(currentAnnouncement.id)
                ? 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                : 'text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400',
            ]"
            @click="handleLike"
          >
            <Icon
              :name="isLiked(currentAnnouncement.id) ? 'heroicons:heart-solid' : 'heroicons:heart'"
              class="w-4 h-4"
            />
            <span class="sr-only">{{ isLiked(currentAnnouncement.id) ? 'Unlike' : 'Like' }}</span>
          </button>
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
          class="w-full rounded-md sec-btn"
          @click="handleDontShowAgain"
        >
          Don't show again
        </button>
        <button
          type="button"
          class="w-full rounded-md pri-btn"
          @click="handleDismiss"
        >
          Got it!
        </button>
      </div>
    </template>
  </Modal>

  <template v-if="isDev">
    <button
      class="fixed z-20 game-ui-btn bottom-20 left-4"
      @click="resetAnnouncementPreferences"
    >
      <Icon
        name="mdi:restore"
        class="w-5 h-5 text-white"
        aria-hidden
      />
      <span class="sr-only"> Reset Announcements </span>
    </button>
  </template>
</template>

<script setup lang="ts">
import { useAnnouncements } from '~/composables/useAnnouncements'

// Use the announcements composable directly
const {
  newAnnouncements,
  isAnnouncementModalOpen,
  checkAndShowAnnouncements,
  dismissAnnouncements,
  dontShowAnnouncementsAgain,
  resetAnnouncementPreferences,
  trackLike,
  isLiked,
  impressions,
} = await useAnnouncements()

// Pagination state
const currentPage = ref(0)

const isDev = ref(process.env.NUXT_PUBLIC_NODE_ENV === 'development')

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

const handleLike = () => {
  if (currentAnnouncement.value) {
    trackLike(currentAnnouncement.value.id)
  }
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
