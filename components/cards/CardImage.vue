<template>
  <div
    v-if="!loaded"
    class="w-full h-full bg-black/20 animate-pulse"
  />
  <template
    v-if="!!src"
    v-show="loaded"
  >
    <NuxtImg
      :key="`${card}-${currentDesign}`"
      :src="src"
      :alt="card"
      @load="handleLoad"
      loading="eager"
      class="object-cover pointer-events-none user-select-none"
      sizes="100vw"
    />
  </template>
  <div
    v-else
    class="w-full h-full bg-black/20 animate-pulse"
  />
</template>

<script setup lang="ts">
import { type CardName } from '~/utils/cards'

const { card, src } = defineProps<{ card: CardName; src: string | undefined }>()

const loaded = ref(false)
const { useDesign } = useCardDesign()
const currentDesign = useDesign()

const handleLoad = () => {
  loaded.value = true
}
</script>
