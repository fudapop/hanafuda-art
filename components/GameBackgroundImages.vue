<template>
  <div class="relative w-full h-full min-h-screen overflow-hidden isolate -z-50">
    <!-- Background -->
    <div
      class="absolute inset-0 -z-10 dark:after:content-[''] dark:after:absolute dark:after:inset-0 dark:bg-brown-500/50"
    >
      <img
        src="/images/bg-ingame.webp"
        class="object-cover w-full h-full dark:invert"
      />
    </div>
    <!-- Top decorative bar using image asset -->
    <Transition
      mode="in-out"
      appear
      enter-active-class="duration-1000 ease-out"
      enter-from-class="-translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="duration-1000 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-full opacity-0"
    >
      <div
        v-if="showPlayerBars"
        class="fixed top-0 left-0 right-0 z-10"
      >
        <div class="static h-16 sm:scale-y-[2] origin-top transition-transform">
          <img
            src="/images/player_bar.webp"
            class="w-full h-full"
            alt="Top decorative border"
          />
        </div>
      </div>
    </Transition>

    <!-- Bottom decorative bar using image asset -->
    <Transition
      mode="in-out"
      appear
      enter-active-class="duration-1000 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="duration-1000 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="showPlayerBars"
        class="fixed bottom-0 left-0 right-0 z-10"
      >
        <div class="static h-16 sm:scale-y-[2] origin-bottom transition-transform">
          <img
            src="/images/player_bar_bottom.webp"
            class="flex-shrink-0 w-full h-full"
            alt="Bottom decorative border"
          />
        </div>
      </div>
    </Transition>

    <!-- Main game area -->
    <div class="relative flex items-center justify-center w-full h-full game-content">
      <div
        class="absolute inset-0 z-20 duration-300 dark:bg-gradient-to-r dark:from-black/30 dark:via-black/10 dark:to-black/30"
      ></div>
      <!-- Side decorative flowers -->
      <Transition
        mode="in-out"
        appear
        enter-active-class="duration-1000 ease-out"
        enter-from-class="-translate-x-full opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="duration-1000 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="-translate-x-full opacity-0"
      >
        <div
          class="bottom-0 left-0 transition-all origin-left -translate-x-1/2 flower-ornament lg:-translate-y-1/2 dark:invert dark:grayscale"
        >
          <img
            src="/images/flower_ingame.webp"
            :class="{
              'object-contain w-full h-full [animation-fill-mode:forwards]': true,
              'animate-spin [animation-duration:60s]': animate,
            }"
            alt="Decorative flower"
          />
        </div>
      </Transition>
      <Transition
        mode="in-out"
        appear
        enter-active-class="duration-1000 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="duration-1000 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div
          class="top-0 right-0 transition-all origin-right translate-x-1/2 flower-ornament lg:translate-y-1/2 dark:invert dark:grayscale"
        >
          <img
            src="/images/flower_ingame.webp"
            :class="{
              'object-contain w-full h-full [animation-fill-mode:forwards]': true,
              'animate-spin [animation-duration:60s]': animate,
            }"
            alt="Decorative flower"
          />
        </div>
      </Transition>

      <!-- Main content slot -->
      <div class="relative z-10 w-full h-full">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { showPlayerBars = false, animate = false } = defineProps<{
  showPlayerBars?: boolean
  animate?: boolean
}>()
</script>

<style scoped>
.flower-ornament {
  position: fixed;

  height: 50%;
  width: auto;

  scale: 0.25;
  z-index: 5;

  user-select: none;

  @media (min-width: 768px) {
    scale: 1;
  }
}
</style>
