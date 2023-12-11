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
  action?: (param?: any) => void;
  buttonClass?: "primary" | "secondary" | "accent";
  customClass?: string;
  type?: "button" | "submit" | "reset";
}>();

const primaryClass =
  "relative inline-flex items-center px-3 py-2 text-sm font-semibold text-white dark:text-gray-900 bg-indigo-600 dark:bg-yellow-300 rounded-md shadow-sm hover:bg-indigo-500 dark:hover:bg-yellow-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-yellow-100";
const secondaryClass =
  "rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700";

const className = computed(() => {
  if (customClass) return customClass;
  switch (buttonClass) {
    case "primary":
      return primaryClass;
    case "secondary":
      return secondaryClass;
    default:
      return primaryClass;
  }
});
</script>
