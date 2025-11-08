<template>
  <a
    v-if="!!designInfo.creator"
    :title="designInfo.urlDescription"
    :href="designInfo.url"
    target="_blank"
    class="text-xs italic opacity-50 pointer-events-auto! dark:text-white underline underline-offset-4 whitespace-nowrap"
    v-posthog-capture="{
      event: 'view_artist_website',
      properties: {
        artist: designInfo.creator,
        url: designInfo.url,
      },
    }"
  >
    {{ t('deck.artBy', { creator: designInfo.creator }) }}
  </a>
</template>

<script setup lang="ts">
const { getDesignInfo, currentDesign } = useCardDesign()
const designInfo = computed(() => getDesignInfo(currentDesign.value))
const { t } = useI18n()
</script>
