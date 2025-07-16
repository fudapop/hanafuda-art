<template>
  <span
    v-if="!!designInfo.creator"
    class="text-xs italic opacity-40 !pointer-events-auto dark:text-white"
  >
    <span class="cursor-default"> Cards by </span>
    <a
      v-if="designInfo.creator"
      :title="designInfo.urlDescription"
      :href="designInfo.url"
      target="_blank"
      class="underline underline-offset-4 whitespace-nowrap"
    >
      {{ designInfo.creator }}
    </a>
  </span>
</template>

<script setup lang="ts">
const { getDesignInfo, currentDesign } = useCardDesign()
const designInfo = computed(() => getDesignInfo(currentDesign.value))
</script>
