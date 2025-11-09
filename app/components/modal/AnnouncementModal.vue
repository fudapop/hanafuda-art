<template>
  <Modal
    :open="isAnnouncementModalOpen"
    class="announcement-modal"
    :padded="false"
  >
    <template #title>
      <div class="flex flex-col items-center justify-between px-8 sm:flex-row">
        <div class="flex flex-col items-center sm:flex-row gap-x-2">
          <MegaphoneIcon
            class="w-6 h-6 text-primary"
            aria-hidden
          />
          <h1 class="text-lg sm:text-xl">{{ t('announcements.whatsNewTitle') }}</h1>
        </div>
        <!-- <div
          v-if="newAnnouncements.length > 1"
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
        >
          <span class="text-sm sm:text-base"
            >{{ currentPage + 1 }} of {{ newAnnouncements.length }}</span
          >
        </div> -->
      </div>
    </template>

    <template #description>
      <div class="text-left">
        <!-- Current announcement -->
        <div
          v-if="currentAnnouncement"
          :class="['text-sm overflow-y-auto h-[60dvh] px-8', isMobile && 'h-max']"
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
            <div class="pl-3 border-l-2 border-primary">
              <h4 class="font-semibold text-left">
                {{ currentAnnouncement.title }}
              </h4>
              <p class="mb-2 text-xs text-left">
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
      </div>
    </template>

    <template #actions="{ scrollToTop }">
      <!-- Impression tracking -->
      <div
        v-if="currentAnnouncement"
        class="flex items-center justify-between px-8 py-4"
      >
        <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span class="flex items-center gap-1">
            <Icon name="mdi:eye-outline" />
            {{ impressions[currentAnnouncement.id]?.views || 0 }}
            <span class="sr-only">{{ t('announcements.metrics.views') }}</span>
          </span>
          <button
            type="button"
            :class="[
              'flex items-center gap-2 px-2 py-1 text-sm rounded-md transition-colors',
              'focus:outline-hidden focus-visible:outline-hidden',
              'focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2',
              isLiked(currentAnnouncement.id)
                ? 'text-primary hover:text-primary/80'
                : 'text-text-secondary hover:text-primary/80',
            ]"
            @click="handleLike"
          >
            <Icon
              :name="isLiked(currentAnnouncement.id) ? 'mdi:heart' : 'mdi:heart-outline'"
              class="text-sm"
            />
            <span class="sr-only">{{
              isLiked(currentAnnouncement.id)
                ? t('common.actions.unlike')
                : t('common.actions.like')
            }}</span>
          </button>
        </div>
      </div>

      <!-- Pagination controls -->
      <div
        v-if="newAnnouncements.length > 1"
        class="flex items-center justify-between px-4 py-4 border-t border-border"
      >
        <button
          type="button"
          :disabled="currentPage === 0"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
            currentPage === 0
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'text-text focus-visible:ring-1 focus-visible:ring-primary',
          ]"
          @click="
            () => {
              previousAnnouncement()
              scrollToTop()
            }
          "
        >
          <Icon
            name="mdi:chevron-left"
            class="text-sm"
          />
          {{ t('common.actions.previous') }}
        </button>

        <!-- Page indicators -->
        <div class="flex gap-2">
          <button
            v-for="(announcement, index) in newAnnouncements"
            :key="announcement.id"
            type="button"
            :class="[
              'w-2 h-2 rounded-full transition-colors',
              index === currentPage ? 'bg-primary' : 'border border-border',
            ]"
            @click="currentPage = index"
          />
        </div>

        <button
          type="button"
          :disabled="currentPage === newAnnouncements.length - 1"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-sm rounded-xs transition-colors',
            currentPage === newAnnouncements.length - 1
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'text-text focus-visible:ring-1 focus-visible:ring-primary',
          ]"
          @click="
            () => {
              nextAnnouncement()
              scrollToTop()
            }
          "
        >
          {{ t('common.actions.next') }}
          <Icon
            name="mdi:chevron-right"
            class="text-sm"
          />
        </button>
      </div>

      <div class="flex flex-col gap-3 px-8 mb-4">
        <button
          type="button"
          class="w-full pri-btn"
          @click="handleDismiss"
          v-posthog-capture="{
            event: 'dismiss_announcement',
            properties: {
              announcement: currentAnnouncement?.title,
            },
          }"
        >
          {{ t('announcements.dismiss') }}
        </button>
        <button
          type="button"
          class="w-full text-sm underline appearance-none text-text"
          @click="handleDontShowAgain"
          v-posthog-capture="{
            event: 'dont_show_again_announcement',
            properties: {
              announcement: currentAnnouncement?.title,
            },
          }"
        >
          {{ t('announcements.dontShowAgain') }}
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
        class="text-sm text-white"
        aria-hidden
      />
      <span class="sr-only"> Reset Announcements </span>
    </button>
  </template>
</template>

<script setup lang="ts">
import { MegaphoneIcon } from '@heroicons/vue/20/solid'
import { useAnnouncements } from '~/composables/useAnnouncements'

const { isMobile } = useDevice()
const { t } = useI18n()

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

const config = useRuntimeConfig()
const isDev = config.public.nodeEnv === 'development'

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
