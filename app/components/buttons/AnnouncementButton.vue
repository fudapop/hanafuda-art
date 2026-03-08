<template>
  <NuxtLink
    :to="announcementsRoute"
    :class="[
      'game-ui-btn fixed z-10 top-4 right-14',
      !hasNewAnnouncements && 'opacity-90 hover:opacity-100',
    ]"
    :title="t('announcements.pageTitle')"
  >
    <Icon
      name="mdi:megaphone"
      class="text-white"
      aria-hidden
    />
    <span class="sr-only">{{ t('announcements.pageTitle') }}</span>

    <!-- Unread badge -->
    <span
      v-if="newAnnouncementCount > 0 && !dontShowAnnouncements"
      class="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full -top-1.5 -right-1.5 bg-hanafuda-red"
    >
      {{ newAnnouncementCount }}
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localeRoute = useLocaleRoute()

const {
  hasNewAnnouncements,
  newAnnouncementCount,
  dontShowAnnouncements,
} = await useAnnouncements()

const announcementsRoute = computed(() => localeRoute('/announcements'))
</script>
