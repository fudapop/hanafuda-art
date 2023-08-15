<template>
  <div
    v-if="koikoiIsCalled"
    class="relative h-full w-full animate-pulse [animation-duration:15s]"
  >
    <TransitionGroup
      enter-active-class="duration-200"
      enter-to-class="opacity-90 scale-100"
      enter-from-class="opacity-0 scale-0"
      leave-active-class="duration-200"
      leave-to-class="opacity-0 scale-0"
      leave-from-class="opacity-90 scale-100"
      appear
    >
      <div
        v-for="(pos, index) in posArr"
        :key="index"
        class="w-6 h-6 absolute"
        :style="{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          transitionDelay: `${index * 100}ms`,
        }"
      >
        <img
          src="/images/sakura.webp"
          class="animate-spin [animation-duration:20s] drop-shadow-md"
        />
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useWindowSize } from "@vueuse/core";
const { width, height } = useWindowSize();

const { koikoiIsCalled } = useDecisionHandler();

const posArr: Ref<any[]> = ref([]);
const generatedPositions = (n: number) => {
  return getRange(n).map((n) => ({
    y: Math.floor(Math.random() * width.value),
    x: Math.floor(Math.random() * height.value),
  }));
};

onMounted(() => {
  posArr.value = generatedPositions(8);
});
</script>

<style scoped></style>
