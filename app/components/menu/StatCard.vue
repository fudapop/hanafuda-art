<template>
  <button
    class="w-full rounded-lg bg-surface border border-border p-3 hover:bg-background hover:border-primary transition-colors cursor-pointer text-left"
    :class="customClass"
    type="button"
    @click="$emit('click')"
  >
    <div
      v-if="title || showHelp"
      class="flex items-center justify-between mb-3"
    >
      <h4
        v-if="title"
        class="text-sm font-semibold text-text-secondary"
      >
        {{ title }}
      </h4>
      <QuestionMarkCircleIcon
        v-if="showHelp"
        class="w-4 h-4 text-text-secondary"
      />
    </div>
    <div class="text-center">
      <div class="text-sm font-medium text-text-secondary mb-2">
        {{ label }}
      </div>
      <div class="text-3xl font-bold text-text">
        {{ value }}
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'

type Props = {
  title?: string
  label: string
  value: number
  showHelp?: boolean
  customClass?: string
}

defineProps<Props>()

defineEmits<{
  click: []
}>()
</script>
