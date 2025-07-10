<template>
  <div class="w-full h-full">
    <div
      v-if="!src"
      class="w-full h-full down animate-pulse bg-black/30"
    />
    <template v-else>
      <NuxtImg
        :key="`${card}-${src}`"
        :src="img(src, { height: 100, quality: 80, format: 'webp' })"
        :alt="card"
        loading="eager"
        class="object-cover pointer-events-none user-select-none"
        sizes="100vw"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { type CardName } from '~/utils/cards'

const { card, src } = defineProps<{ card: CardName; src: string | undefined }>()

const img = useImage()
</script>
