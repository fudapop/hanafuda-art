<template>
  <div
    class="sm:[@media_(max-height:500px)]:[--card-height:80px] grid grid-rows-[80px_1fr_80px] sm:grid-rows-[50px_1fr_50px] h-[100dvh] overflow-y-hidden overflow-x-hidden relative"
  >
    <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10">
      <MoonBackground />
      <AnimatedBackground />
    </div>

    <div class="absolute flex top-4 right-4 gap-x-4">
      <OptionsMenu :tabCategories="tabs">
        <template #tab-panel-1>
          <DesignSelector />
        </template>
        <template #tab-panel-2>
          <GameplaySettings />
        </template>
        <template #tab-panel-3>
          <LazyProfilePanel />
        </template>
      </OptionsMenu>
    </div>

    <!-- Opponent Status Bar -->
    <div
      :class="{
        'z-[-1] duration-300 transition-all bg-gray-50 dark:bg-[#40495a75] border-b-slate-500 sm:[@media_(max-height:500px)]:w-1/2 sm:[@media_(max-height:500px)]:rounded-br-full': true,
        'opacity-40': players.p1.isActive,
        '-translate-y-full': !gameStart,
      }"
    >
      <div class="p-2">
        <StatusBar :user="null" playerNum="2" />
      </div>
    </div>

    <Transition
      mode="out-in"
      appear
      leave-active-class="duration-300 ease-in"
      leave-to-class="opacity-0"
      leave-from-class="opacity-100"
      enter-active-class="duration-300 ease-out"
      enter-to-class="opacity-100"
      enter-from-class="opacity-0"
    >
      <PlayArea v-if="gameStart">
        <slot />
      </PlayArea>
      <div v-else class="relative h-full">
        <StartScreen @start-game="gameStart = true" />
      </div>
    </Transition>

    <!-- Player Status Bar -->
    <div
      :class="{
        'z-[-1] duration-300 transition-all bg-gray-50 dark:bg-[#40495a75] border-t-slate-500 sm:[@media_(max-height:500px)]:w-1/2 sm:[@media_(max-height:500px)]:rounded-tr-full': true,
        'opacity-40': players.p2.isActive,
        'translate-y-full': !gameStart,
      }"
    >
      <div class="p-2">
        <StatusBar :user="user" playerNum="1" />
      </div>
    </div>

    <div class="absolute w-max bottom-4 right-4">
      <button
        type="button"
        @click="handleClick"
        class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-gray-50/20 dark:bg-gray-700/50 px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-50 shadow-sm ring-1 ring-inset ring-gray-300/10 dark:ring-gray-500/10 hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        <ArrowLeftOnRectangleIcon
          class="w-8 h-8 text-gray-700 dark:text-gray-300"
          aria-hidden="true"
        />
        <span class="sr-only">Return to homepage</span>
      </button>
    </div>

    <ExitModal
      :open="leavingGame"
      @cancel="leavingGame = false"
      @exit-game="handleExit"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftOnRectangleIcon } from "@heroicons/vue/24/outline";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "~/stores/playerStore";

const { players } = storeToRefs(usePlayerStore());
const user = useCurrentUser();

const tabs = ref(["Design", "Gameplay", "Profile"]);
const gameStart = useState("start", () => false);
const leavingGame = ref(false);

const handleClick = () => {
  if (!gameStart.value) {
    navigateTo("/");
  } else {
    leavingGame.value = true;
  }
};

const handleExit = () => {
  leavingGame.value = false;
  gameStart.value = false;
};
</script>

<style scoped></style>
