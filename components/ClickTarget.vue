<template>
  <div class="relative p-0 w-max h-max" @click.capture="handleClick">
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
  // console.log(ev.target);
  const position = getPosition((ev.target as Element));
  emits("locate", position);

};
</script>

<style scoped></style>
