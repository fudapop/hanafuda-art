<template>
  <div class="relative min-w-[150px] pt-8">
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :id="ratingId"
      type="range"
      min="0"
      max="5"
      step="1"
      class="absolute inset-0 opacity-0 appearance-none cursor-pointer peer"
    />
    <label
      :for="ratingId"
      class="absolute flex inset-0 m-auto pl-[1.5ch] -top-2 justify-between pointer-events-none text-3xl rounded-sm peer-focus-visible:ring-2 peer-focus-visible:ring-primary"
    >
      <span
        v-for="n in getRange(modelValue)"
        class="text-primary"
        >&starf;</span
      >
      <span
        v-for="n in getRange(5 - modelValue)"
        class="opacity-50 text-text-secondary"
        >&star;</span
      >
    </label>
  </div>
</template>

<script setup lang="ts">
import { getRange } from '~/utils/myUtils'
const { ratingId, modelValue } = defineProps<{ ratingId: string; modelValue: number }>()
defineEmits(['update:modelValue'])
</script>
