<template>
  <div class="absolute inset-0 mx-auto mt-[100px]">
    <HeadlessTransitionRoot appear :show="show">
      <HeadlessTransitionChild
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <van-loading :size="size || '64px'" :color="color || '#3367D6'" vertical>
          <slot />
        </van-loading>
      </HeadlessTransitionChild>
    </HeadlessTransitionRoot>
  </div>
</template>

<script setup lang="ts">
const { size, color, show } = defineProps<{
  show: boolean;
  size?: string | number;
  color?: string;
}>();
</script>

<style scoped></style>
