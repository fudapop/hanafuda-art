<template>
  <a
    v-if="!!designInfo.creator"
    :title="designInfo.urlDescription"
    :href="designInfo.url"
    target="_blank"
    class="text-xs italic opacity-50 !pointer-events-auto sm:text-white underline underline-offset-4 whitespace-nowrap"
  >
    {{ $t('deck.artBy', { creator: designInfo.creator }) }}
  </a>
</template>

<script setup lang="ts">
const { getDesignInfo, currentDesign } = useCardDesign()
const designInfo = computed(() => getDesignInfo(currentDesign.value))
</script>
