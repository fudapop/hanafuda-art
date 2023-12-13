<template>
  <template v-if="src" v-show="loaded">
    <NuxtImg
      :title="card.replace(/-\d?/g, ' ')"
      :src="src"
      :alt="card"
      @load="handleLoad"
      loading="eager"
      class="object-cover aspect-[--card-aspect]"
    />
  </template>
</template>

<script setup lang="ts">
import { CardName } from "~/utils/cards";

const { card, src } = defineProps<{ card: CardName; src: string }>();

const loaded = ref(false);

const handleLoad = () => {
  loaded.value = true;
};
</script>
