<template>
  <div class="w-max h-max p-0" @click.capture="handleClick">
    <slot />
  </div>
</template>

<script setup lang="ts">
const emits = defineEmits(["locate"]);

const getPosition = (element: Element) => {
  const { x, y } = element.getBoundingClientRect();
  return [x, y];
};

const handleClick = (ev: Event) => {
  const position = getPosition(ev.target as Element);
  emits("locate", position);
};
</script>

<style scoped></style>
