<template>
  <template v-if="src" v-show="loaded">
    <NuxtImg
      :src="src"
      :alt="card"
      @load="handleLoad"
      loading="eager"
      class="object-cover aspect-[--card-aspect] user-select-none pointer-events-none"
    />
  </template>
</template>

<script setup lang="ts">
import { type CardName } from "~/utils/cards";

const { card, src } = defineProps<{ card: CardName; src: string }>();

const loaded = ref(false);

const handleLoad = () => {
  loaded.value = true;
};
</script>
