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
      class="peer absolute inset-0 cursor-pointer appearance-none opacity-0"
    />
    <label
      :for="ratingId"
      class="absolute flex inset-0 m-auto pl-[1.5ch] -top-2 justify-between pointer-events-none text-3xl rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-600"
    >
      <span
        v-for="n in getRange(modelValue)"
        class="text-indigo-600 dark:text-yellow-300"
        >&starf;</span
      >
      <span
        v-for="n in getRange(5 - modelValue)"
        class="text-gray-500"
        >&star;</span
      >
    </label>
  </div>
</template>

<script setup lang="ts">
const { ratingId, modelValue } = defineProps<{ ratingId: string; modelValue: number }>()
defineEmits(['update:modelValue'])
</script>
