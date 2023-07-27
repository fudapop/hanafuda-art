<template>
  <div class="grid grid-rows-[80px_1fr_80px] h-[100dvh]">
    <!-- Opponent Status Bar -->
    <div
      :class="{
        'border border-b-slate-600 transition-colors duration-300': true,
        'bg-green-500 border-b-green-300': activePlayer.id === 'p2',
        'bg-slate-300': activePlayer.id === 'p1',
      }"
    ></div>
    <PlayArea>
      <slot />
    </PlayArea>
    <!-- Player Status Bar -->
    <div
      :class="{
        'border border-t-slate-600 transition-colors duration-300': true,
        'bg-green-500 border-t-green-300': activePlayer.id === 'p1',
        'bg-slate-300': activePlayer.id === 'p2',
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useGlobalStore } from "~/stores/globalStore";

const { activePlayer } = storeToRefs(useGlobalStore());
</script>

<style scoped></style>
