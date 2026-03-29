<template>
  <fieldset
    class="flex gap-1"
    :aria-label="ratingId"
  >
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      class="text-3xl transition-transform cursor-pointer select-none hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
      :class="n <= modelValue ? 'text-primary' : 'opacity-50 text-text-secondary'"
      :aria-label="`${n} star${n > 1 ? 's' : ''}`"
      :aria-pressed="n <= modelValue"
      @click="$emit('update:modelValue', n === modelValue ? 0 : n)"
    >
      {{ n <= modelValue ? '★' : '☆' }}
    </button>
  </fieldset>
</template>

<script setup lang="ts">
const { ratingId, modelValue } = defineProps<{ ratingId: string; modelValue: number }>()
defineEmits(['update:modelValue'])
</script>
