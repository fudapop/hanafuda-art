<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="-translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="-translate-y-full"
  >
    <div
      v-if="visible"
      class="fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-3 px-4 py-4 bg-surface/90 backdrop-blur-sm border-b border-border"
    >
      <NuxtLink
        :to="announcementsRoute"
        class="flex items-center gap-2 text-sm truncate text-text hover:text-primary transition-colors"
        @click="dismiss"
      >
        <MegaphoneIcon
          class="w-4 h-4 shrink-0 text-primary"
          aria-hidden
        />
        <span class="font-medium truncate">{{ latestTitle }}</span>
        <span class="shrink-0 text-xs text-text-secondary">&mdash; {{ t('announcements.bannerCta') }}</span>
      </NuxtLink>

      <button
        type="button"
        class="p-1 shrink-0 text-text-secondary hover:text-text transition-colors"
        :title="t('common.actions.close')"
        :aria-label="t('common.actions.close')"
        @click="dismiss"
      >
        <XMarkIcon class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { MegaphoneIcon, XMarkIcon } from '@heroicons/vue/20/solid'

const { t } = useI18n()
const localeRoute = useLocaleRoute()

const {
  newAnnouncements,
  hasNewAnnouncements,
  dontShowAnnouncements,
} = await useAnnouncements()

const announcementsRoute = computed(() => localeRoute('/announcements'))

const dismissed = ref(false)

const latestTitle = computed(() => newAnnouncements.value[0]?.title ?? '')

const visible = computed(() =>
  hasNewAnnouncements.value &&
  !dontShowAnnouncements.value &&
  !dismissed.value,
)

const dismiss = () => {
  dismissed.value = true
}
</script>
