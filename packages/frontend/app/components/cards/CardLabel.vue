<template>
  <span
    class="absolute top-0 left-0 z-30 w-0 h-0 border-t-25 border-r-25 border-t-gray-700/80 border-r-transparent"
  >
  </span>
  <span class="absolute top-0 z-31 text-white text-[10px] font-['Potta_One'] left-1">
    {{ entry?.month }}
  </span>
  <span
    class="absolute bottom-0 left-0 z-30 w-0 h-0 border-b-25 border-r-25 border-b-gray-700/80 border-r-transparent"
  >
  </span>
  <span class="absolute bottom-0 z-31 text-[10px] text-white font-['Potta_One'] left-1">
    {{ typeMark }}
  </span>
  <span
    class="absolute bottom-0 right-0 z-30 w-0 h-0 border-b-25 border-l-25 border-b-gray-700/80 border-l-transparent"
  >
  </span>
  <span class="absolute bottom-0 z-31 text-white text-[10px] font-['Potta_One'] right-1">
    {{ entry?.month }}
  </span>
  <span
    class="absolute top-0 right-0 z-30 w-0 h-0 border-t-25 border-l-25 border-t-gray-700/80 border-l-transparent"
  >
  </span>
  <span class="absolute top-0 z-31 text-[10px] text-white font-['Potta_One'] right-1">
    {{ typeMark }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type CardName, CARDS } from '~/utils/cards'

const { card } = defineProps<{
  card: CardName
}>()

// CARDS is a string index, and CardName includes 'card-back', which has no entry.
const entry = computed(() => CARDS[card])
const typeMark = computed(() => entry.value?.type.at(0)?.toUpperCase() ?? '')
</script>
