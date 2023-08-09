<template>
  <button type="button" :class="className" @click="action">
    <slot />
  </button>
</template>

<script setup lang="ts">
const { buttonClass, action, customClass } = defineProps<{
  action: () => void;
  buttonClass?: "primary" | "secondary" | "accent";
  customClass?: string;
}>();

const primaryClass =
  "relative inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
const secondaryClass =
  "rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50";

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
