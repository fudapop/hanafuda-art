<template>
  <div class="grid grid-rows-[80px_1fr_80px] h-[100dvh] overflow-hidden relative">
    <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10">
      <MoonBackground />
      <AnimatedBackground />
    </div>

    <div class="absolute flex top-6 right-4 gap-x-4">
      <OptionsMenu :tabCategories="tabs">
        <template #tab-panel-1>
          <DesignSelector />
        </template>
        <template #tab-panel-2>
          <GameplaySettings />
        </template>
        <template #tab-panel-3>
          <ProfilePanel />
        </template>
      </OptionsMenu>
    </div>

    <!-- Opponent Status Bar -->
    <div
      :class="{
        'z-[-1] duration-300 transition-opacity bg-gray-50 dark:bg-[#40495a75] border-b-slate-500': true,
        'opacity-40': players.p1.isActive,
      }"
    >
      <div class="p-2">
        <StatusBar :user="null" playerNum="2" />
      </div>
    </div>

    <PlayArea>
      <slot />
    </PlayArea>

    <!-- Player Status Bar -->
    <div
      :class="{
        'z-[-1] duration-300 transition-opacity bg-gray-50 dark:bg-[#40495a75] border-t-slate-500': true,
        'opacity-40': players.p2.isActive,
      }"
    >
      <div class="p-2">
        <StatusBar :user="user" playerNum="1" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePlayerStore } from "~/stores/playerStore";

const { players } = storeToRefs(usePlayerStore());
const user = await getCurrentUser();

const tabs = ref(["Design", "Gameplay", "Profile"]);
</script>

<style scoped></style>
