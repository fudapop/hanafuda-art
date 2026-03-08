<template>
  <ContentLayout>
    <ContentCard>
      <h1 class="mb-6 text-2xl font-bold">{{ t('announcements.pageTitle') }}</h1>

      <div
        v-if="announcements.length === 0"
        class="py-8 text-center text-text-secondary"
      >
        {{ t('announcements.noAnnouncements') }}
      </div>

      <div
        v-else
        class="space-y-8"
      >
        <article
          v-for="announcement in announcements"
          :key="announcement.id"
          class="pb-8 border-b last:border-b-0 border-border"
        >
          <!-- Header with title and date -->
          <div class="not-prose mb-3">
            <span
              v-if="isNew(announcement.id)"
              class="inline-block mb-1 px-2 py-0.5 text-xs font-bold text-white rounded-full bg-hanafuda-red"
            >
              {{ t('announcements.new') }}
            </span>
            <div class="flex flex-wrap items-baseline gap-x-2">
              <h2 class="text-lg font-semibold">{{ announcement.title }}</h2>
              <span class="text-xs text-text-secondary">{{ announcement.date }}</span>
            </div>
          </div>

          <!-- Content body -->
          <section
            v-if="announcement.body"
            class="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0"
          >
            <ContentRenderer
              :value="announcement"
              :components="{ h1: 'h3', h2: 'h4', h3: 'h5' }"
            />
          </section>
          <section v-else>
            <p class="mb-3 text-sm">{{ announcement.description }}</p>
            <ul
              v-if="announcement.features?.length"
              class="space-y-1 list-disc list-inside"
            >
              <li
                v-for="feature in announcement.features"
                :key="feature"
                class="text-xs"
              >
                {{ feature }}
              </li>
            </ul>
          </section>

          <!-- Impression stats and like -->
          <div class="flex items-center gap-4 mt-4 text-sm text-text-secondary">
            <span class="flex items-center gap-1">
              <Icon name="mdi:eye-outline" />
              {{ impressions[announcement.id]?.views || 0 }}
              <span class="sr-only">{{ t('announcements.metrics.views') }}</span>
            </span>
            <button
              type="button"
              :class="[
                'flex items-center gap-1 px-2 py-1 rounded-md transition-colors',
                'focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2',
                isLiked(announcement.id)
                  ? 'text-primary hover:text-primary/80'
                  : 'text-text-secondary hover:text-primary/80',
              ]"
              @click="trackLike(announcement.id)"
            >
              <Icon
                :name="isLiked(announcement.id) ? 'mdi:heart' : 'mdi:heart-outline'"
                class="text-sm"
              />
              {{ impressions[announcement.id]?.likes || 0 }}
              <span class="sr-only">{{
                isLiked(announcement.id)
                  ? t('common.actions.unlike')
                  : t('common.actions.like')
              }}</span>
            </button>
          </div>
        </article>
      </div>
    </ContentCard>
  </ContentLayout>
</template>

<script setup lang="ts">
const { t } = useI18n()

const pageTitle = computed(() => `${t('game.title')} | ${t('pages.announcements')}`)
const pageDescription = computed(() =>
  t('pageDescriptions.announcements', { appName: t('game.title') }),
)

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
})

const {
  announcements,
  newAnnouncements,
  markAllAsRead,
  trackView,
  trackLike,
  isLiked,
  impressions,
} = await useAnnouncements()

// Track which announcements are "new" (unread) before marking as read
const unreadIds = new Set(newAnnouncements.value.map((a) => a.id))
const isNew = (id: string) => unreadIds.has(id)

// Mark all as read and track views for unread announcements on mount
onMounted(() => {
  markAllAsRead()
  announcements.value
    .filter((a) => unreadIds.has(a.id))
    .forEach((a) => trackView(a.id))
})
</script>
