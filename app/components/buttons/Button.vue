<template>
  <button
    :type="type || 'button'"
    :class="`disabled:bg-gray-300 disabled:cursor-not-allowed ${className}`"
    @click="action"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
const { buttonClass, action, customClass, type } = defineProps<{
  action?: (param?: any) => void
  buttonClass?: 'primary' | 'secondary' | 'accent' | 'game-ui'
  customClass?: string
  type?: 'button' | 'submit' | 'reset'
}>()

const primaryClass =
  'relative inline-flex items-center px-3 py-2 text-sm font-semibold text-white dark:text-gray-900 bg-indigo-600 dark:bg-yellow-300 rounded-md shadow-sm hover:bg-indigo-500 dark:hover:bg-yellow-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-yellow-100'
const secondaryClass =
  'rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
const gameUiClass =
  'flex items-center justify-center w-12 h-12 text-sm font-semibold transition-all duration-300 rounded-lg bg-surface/60 backdrop-blur-sm border border-border/40 drop-shadow-lg hover:bg-surface/80 hover:border-border/60 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-lg hover:shadow-xl'

const className = computed(() => {
  if (customClass) return customClass
  switch (buttonClass) {
    case 'primary':
      return primaryClass
    case 'secondary':
      return secondaryClass
    case 'game-ui':
      return gameUiClass
    default:
      return primaryClass
  }
})
</script>
