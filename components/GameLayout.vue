<template>
  <div
    class="sm:[@media_(max-height:500px)]:[--card-height:80px] grid grid-rows-[80px_1fr_80px] sm:[@media_(max-height:500px)]:grid-rows-[50px_1fr_50px] h-[100dvh] overflow-hidden relative"
  >
    <!-- BACKGROUND ELEMENTS -->
    <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10">
      <GameBackground />
      <AnimatedBackground />
    </div>

    <!-- SIDEBAR -->
    <template v-if="gameStart">
      <div class="absolute bottom-4 right-4">
        <button
          v-show="!sidebarOpen"
          title="View Collection Progress"
          class="inline-flex w-full justify-center gap-x-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold drop-shadow-md"
          type="button"
          @click="() => (sidebarOpen = true)"
        >
          <span class="w-8 h-8 text-gray-900 dark:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M11.19 2.25c-.26 0-.52.06-.77.15L3.06 5.45a1.994 1.994 0 0 0-1.09 2.6L6.93 20a2 2 0 0 0 1.81 1.25c.26 0 .53-.03.79-.15l7.37-3.05a2.02 2.02 0 0 0 1.23-1.8c.01-.25-.04-.54-.13-.8L13 3.5a1.954 1.954 0 0 0-1.81-1.25m3.48 0l3.45 8.35V4.25a2 2 0 0 0-2-2m4.01 1.54v9.03l2.43-5.86a1.99 1.99 0 0 0-1.09-2.6m-10.28-.14l4.98 12.02l-7.39 3.06L3.8 7.29"
              />
            </svg>
          </span>
          <span class="sr-only">Open side panel</span>
        </button>
      </div>
      <LazyProgressPanel :open="sidebarOpen" @close="() => (sidebarOpen = false)" />
    </template>

    <!-- OPTIONS MENU -->
    <div class="absolute flex top-3 right-3 gap-x-4">
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

    <!-- OPPONENT STATUS BAR -->
    <div
      :class="{
        'z-[-1] duration-300 transition-all bg-gray-50 dark:bg-[#40495a] border-b-slate-500 sm:[@media_(max-height:500px)]:w-1/2 sm:[@media_(max-height:500px)]:rounded-br-full': true,
        'opacity-40': players.p1.isActive,
        '-translate-y-full': !gameStart,
      }"
    >
      <div class="p-2">
        <LazyStatusBar :user="null" :playerNum="2" />
      </div>
    </div>

    <!-- GAMEPLAY AREA -->
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
      <PlayArea v-if="gameStart" :class="currentDesign">
        <slot />
      </PlayArea>
      <div v-else class="relative h-full">
        <StartScreen @start-game="gameStart = true" />
      </div>
    </Transition>

    <!-- PLAYER STATUS BAR -->
    <div
      :class="{
        'z-[-1] duration-300 transition-all bg-gray-50 dark:bg-[#40495a] border-t-slate-500 sm:[@media_(max-height:500px)]:w-1/2 sm:[@media_(max-height:500px)]:rounded-tr-full': true,
        'opacity-40': players.p2.isActive,
        'translate-y-full': !gameStart,
      }"
    >
      <div class="p-2">
        <LazyStatusBar :user="user" :playerNum="1" />
      </div>
    </div>

    <!-- EXIT BUTTON -->
    <div v-if="gameStart" class="absolute w-max top-3 right-16">
      <button
        type="button"
        @click="handlePressExit"
        class="inline-flex w-full justify-center gap-x-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold drop-shadow-md"
      >
        <ArrowLeftOnRectangleIcon class="w-8 h-8 text-white" aria-hidden="true" />
        <span class="sr-only">Return to homepage</span>
      </button>
    </div>

    <!-- LOADER -->
    <Transition
      appear
      enter-active-class="duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="showLoader"
        class="absolute inset-0 h-full pointer-events-none top-1/3 isolate"
      >
        <SakuraLoader class="mx-auto opacity-80 w-max" />
        <p
          class="font-semibold tracking-wide text-center text-white drop-shadow-md animate-pulse"
        >
          Just a moment...
        </p>
      </div>
    </Transition>

    <!-- MODALS -->
    <LazyExitWarning
      :open="leavingGame"
      @cancel="leavingGame = false"
      @confirm="handleConfirmExit"
    />
    <LazyFeedbackForm
      :open="promptFeedback"
      @close="
        () => {
          promptFeedback = false;
        }
      "
    />
    <LazySignupPrompt :open="promptSignup" @cancel="handleSignupCancel" />
  </div>
</template>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import { ArrowLeftOnRectangleIcon } from "@heroicons/vue/24/outline";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "~/stores/playerStore";

const currentDesign = useCardDesign().useDesign();

const { players } = storeToRefs(usePlayerStore());
const user = toValue(useProfile().current);

const tabs = ref(["Design", "Gameplay", "Profile"]);
const gameStart = useState("start", () => false);
const leavingGame = ref(false);
const promptFeedback = ref(false);
const promptSignup = ref(false);
const sidebarOpen = ref(false);
const showLoader = ref(false);

const feedbackSubmitted = computed(() => user?.flags?.hasSubmittedFeedback);
const signupDeclined = useStorage("hanafuda-signup-declined", false, sessionStorage);

const handlePressExit = () => {
  if (!gameStart.value) {
    navigateTo("/");
  } else {
    leavingGame.value = true;
  }
};

const handleConfirmExit = () => {
  leavingGame.value = false;
  gameStart.value = false;
};

const handleSignupCancel = async () => {
  showLoader.value = true;
  promptSignup.value = false;
  signupDeclined.value = true;
  await sleep();
  showLoader.value = false;
  promptFeedback.value = true;
};

const unwatch = watch([gameStart, leavingGame], async () => {
  if (!gameStart.value && !leavingGame.value) {
    showLoader.value = true;
    if (user?.isGuest && !signupDeclined.value) {
      await sleep();
      showLoader.value = false;
      promptSignup.value = true;
      return;
    }
    if (!feedbackSubmitted.value) {
      await sleep();
      showLoader.value = false;
      promptFeedback.value = true;
      return;
    }
    await sleep(500);
    showLoader.value = false;
    unwatch();
  }
});
</script>
