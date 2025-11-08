<template>
  <div class="w-full h-full">
    <div
      v-if="!src"
      class="w-full h-full down animate-pulse bg-black/30"
    />
    <template v-else>
      <img
        :key="`${card}-${src}`"
        :src="src"
        :alt="card"
        loading="eager"
        class="pointer-events-none user-select-none"
        sizes="100vw"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { type CardName } from '~/utils/cards'

const { card, src } = defineProps<{ card: CardName; src: string | undefined }>()
</script>
