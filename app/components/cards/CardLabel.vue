<template>
  <span
    class="absolute top-0 left-0 z-30 w-0 h-0 border-t-[25px] border-r-[25px] border-t-gray-700/80 border-r-transparent"
  >
  </span>
  <span class="absolute top-0 z-[31] text-white text-[10px] [font-family:'Potta_One'] left-1">
    {{ CARDS[card].month }}
  </span>
  <span
    class="absolute bottom-0 left-0 z-30 w-0 h-0 border-b-[25px] border-r-[25px] border-b-gray-700/80 border-r-transparent"
  >
  </span>
  <span class="absolute bottom-0 z-[31] text-[10px] text-white [font-family:'Potta_One'] left-1">
    {{ CARDS[card].type[0].toUpperCase() }}
  </span>
  <span
    class="absolute bottom-0 right-0 z-30 w-0 h-0 border-b-[25px] border-l-[25px] border-b-gray-700/80 border-l-transparent"
  >
  </span>
  <span class="absolute bottom-0 z-[31] text-white text-[10px] [font-family:'Potta_One'] right-1">
    {{ CARDS[card].month }}
  </span>
  <span
    class="absolute top-0 right-0 z-30 w-0 h-0 border-t-[25px] border-l-[25px] border-t-gray-700/80 border-l-transparent"
  >
  </span>
  <span class="absolute top-0 z-[31] text-[10px] text-white [font-family:'Potta_One'] right-1">
    {{ CARDS[card].type[0].toUpperCase() }}
  </span>
</template>

<script setup lang="ts">
import { type CardName, CARDS } from '~/utils/cards'

const { card } = defineProps<{
  card: CardName
}>()
</script>
