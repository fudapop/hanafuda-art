<template>
  <div class="grid grid-rows-[80px_1fr_80px] h-[100dvh] overflow-hidden relative">
    <svg :class="{
      'transition-transform duration-[2s] absolute inset-x-0 top-0 -z-10 h-[64rem] w-full stroke-gray-200 [mask-image:radial-gradient(32rem_32rem_at_center,white,transparent)]': true,
      '-translate-y-20': players.p2.isActive,
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
      'z-[-1] border border-b-gray-600 transition-colors duration-500 opacity-75': true,
      'bg-slate-400 border-b-slate-300 opacity-50': players.p1.isActive,
      'bg-slate-100': players.p2.isActive,
    }">
      <div class="p-2">
        <StatusBar :user="null" playerNum="2" />
      </div>
    </div>

    <PlayArea>
      <slot />
    </PlayArea>

    <!-- Player Status Bar -->
    <div :class="{
      'z-[-1] border border-t-gray-600 transition-colors duration-500 opacity-75': true,
      'bg-slate-400 border-t-slate-300 opacity-50': players.p2.isActive,
      'bg-slate-100': players.p1.isActive,
    }">
      <div class="p-2">
        <StatusBar :user="user" playerNum="1" />
      </div>
    </div>
    <div class="absolute bottom-4 right-4">
      <LoginButton />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useGlobalStore } from "~/stores/globalStore";

const { players } = storeToRefs(useGlobalStore());
const user = await getCurrentUser();
</script>

<style scoped></style>
