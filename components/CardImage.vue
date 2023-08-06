<template>
  <template v-if="src" v-show="loaded">
    <NuxtImg :src="src" :alt="card" @load="handleLoad" loading="eager" />
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
