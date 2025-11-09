<template>
  <div class="min-h-screen">
    <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <GameBackgroundImages />
    </div>
    <button class="fixed w-10 h-10 game-ui-btn top-4 left-4 z-20 place-content-center">
      <NuxtLink :to="localeRoute('/')">
        <Icon
          name="mdi:arrow-left"
          class="size-6 mt-1.5 text-white transition-transform duration-300"
        />
        <span class="sr-only">{{ t('navigation.backToTitleScreen') }}</span>
      </NuxtLink>
    </button>
    <slot />
  </div>
</template>

<script setup lang="ts">
const localeRoute = useLocaleRoute()
const { t } = useI18n()
</script>
