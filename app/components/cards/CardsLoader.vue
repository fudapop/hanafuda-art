<template>
  <div class="animated-cards-container looping">
    <div class="shadow-md animated-card down card one"></div>
    <div class="shadow-md animated-card down card two"></div>
    <div class="shadow-md animated-card down card three"></div>
    <div class="shadow-md animated-card down card four"></div>
    <div class="shadow-md animated-card down card five"></div>
    <p
      v-if="!noText"
      class="tracking-wide animate-pulse [animation-duration:4s] text-gray-900 dark:text-white whitespace-nowrap text-center"
    >
      {{ t('common.labels.loading') }}
    </p>
  </div>
</template>

<script setup lang="ts">
const { noText } = defineProps<{ noText?: boolean }>()
const { t } = useI18n()
</script>
