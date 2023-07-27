<template>
  <div :class="{ 'pointer-events-none': !enableCondition }">
    <slot />
  </div>
</template>

<script setup lang="ts">
const { enableCondition } = defineProps<{ enableCondition: boolean }>();
</script>
