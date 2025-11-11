<template>
  <ClientOnly>
    <div class="min-h-screen">
      <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <GameBackgroundImages />
      </div>
      <NuxtLink
        class="fixed game-ui-btn top-4 left-4 z-20"
        :to="localeRoute('/')"
      >
        <Icon
          name="mdi:arrow-left"
          class="text-white"
        />
        <span class="sr-only">{{ t('navigation.backToTitleScreen') }}</span>
      </NuxtLink>
      <slot />
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
const localeRoute = useLocaleRoute()
const { t } = useI18n()
</script>
