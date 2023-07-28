<template>
  <div class="grid grid-rows-[80px_1fr_80px] h-[100dvh] overflow-hidden relative">
    <svg :class="{
      'transition-transform duration-[2s] absolute inset-x-0 top-0 -z-10 h-[64rem] w-full stroke-gray-200 [mask-image:radial-gradient(32rem_32rem_at_center,white,transparent)]': true,
      '-translate-y-20': activePlayer.id === 'p2'
    }" aria-hidden="true">
      <defs>
        <pattern id="1f932ae7-37de-4c0a-a8b0-a6e3b4d44b84" width="200" height="200" x="50%" y="-1"
          patternUnits="userSpaceOnUse">
          <path d="M.5 200V.5H200" fill="none" />
        </pattern>
      </defs>
      <svg x="50%" y="-1" class="overflow-visible fill-gray-50">
        <path d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
          stroke-width="0" />
      </svg>
      <rect width="100%" height="100%" stroke-width="0" fill="url(#1f932ae7-37de-4c0a-a8b0-a6e3b4d44b84)" />
    </svg>
    <!-- Opponent Status Bar -->
    <div :class="{
      'z-[-1] border border-b-slate-600 transition-colors duration-300 opacity-75': true,
      'bg-green-500 border-b-green-300': activePlayer.id === 'p2',
      'bg-slate-300': activePlayer.id === 'p1',
    }"></div>
    <PlayArea>
      <slot />
    </PlayArea>
    <!-- Player Status Bar -->
    <div :class="{
      'z-[-1] border border-t-slate-600 transition-colors duration-300 opacity-75': true,
      'bg-green-500 border-t-green-300': activePlayer.id === 'p1',
      'bg-slate-300': activePlayer.id === 'p2',
    }"></div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useGlobalStore } from "~/stores/globalStore";

const { activePlayer } = storeToRefs(useGlobalStore());
</script>

<style scoped></style>
