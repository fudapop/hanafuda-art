<template>
  <div class="relative w-full h-full min-h-screen overflow-hidden isolate -z-50">
    <!-- Background -->
    <div
      class="absolute inset-0 -z-10 dark:after:content-[''] dark:after:absolute dark:after:inset-0 dark:bg-brown-500/50"
    >
      <img
        src="/images/bg-ingame-1920.webp"
        srcset="
          /images/bg-ingame-640.webp   640w,
          /images/bg-ingame-768.webp   768w,
          /images/bg-ingame-1024.webp 1024w,
          /images/bg-ingame-1280.webp 1280w,
          /images/bg-ingame-1536.webp 1536w,
          /images/bg-ingame-1920.webp 1920w
        "
        class="object-cover w-full h-full dark:invert"
        width="1920"
        height="1091"
        sizes="100vw"
        alt="flower-patterned background"
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
        <div class="static h-16 lg:scale-y-[2] origin-top transition-transform">
          <img
            src="/images/player-bar-1920.webp"
            srcset="
              /images/player-bar-640.webp   640w,
              /images/player-bar-768.webp   768w,
              /images/player-bar-1024.webp 1024w,
              /images/player-bar-1280.webp 1280w,
              /images/player-bar-1536.webp 1536w,
              /images/player-bar-1920.webp 1920w
            "
            class="w-full h-full"
            alt="Top decorative border"
            width="1920"
            height="150"
            sizes="100vw"
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
        <div class="static h-16 lg:scale-y-[2] origin-bottom transition-transform">
          <img
            src="/images/player-bar-bottom-1920.webp"
            srcset="
              /images/player-bar-bottom-640.webp   640w,
              /images/player-bar-bottom-768.webp   768w,
              /images/player-bar-bottom-1024.webp 1024w,
              /images/player-bar-bottom-1280.webp 1280w,
              /images/player-bar-bottom-1536.webp 1536w,
              /images/player-bar-bottom-1920.webp 1920w
            "
            class="shrink-0 w-full h-full"
            alt="Bottom decorative border"
            width="1920"
            height="150"
            sizes="100vw"
          />
        </div>
      </div>
    </Transition>

    <!-- Main game area -->
    <div class="relative flex items-center justify-center w-full h-full game-content">
      <div
        class="absolute inset-0 z-20 duration-300 dark:bg-linear-to-r dark:from-black/30 dark:via-black/10 dark:to-black/30"
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
            src="/images/flower-ingame-720.webp"
            srcset="
              /images/flower-ingame-64.webp   64w,
              /images/flower-ingame-128.webp 128w,
              /images/flower-ingame-256.webp 256w,
              /images/flower-ingame-384.webp 384w,
              /images/flower-ingame-512.webp 512w,
              /images/flower-ingame-720.webp 720w
            "
            :class="{
              'object-contain w-full h-full [animation-fill-mode:forwards]': true,
              'animate-spin [animation-duration:60s]': animate,
            }"
            width="720"
            height="720"
            sizes="(min-width: 768px) 50vh, 12.5vh"
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
            src="/images/flower-ingame-720.webp"
            srcset="
              /images/flower-ingame-64.webp   64w,
              /images/flower-ingame-128.webp 128w,
              /images/flower-ingame-256.webp 256w,
              /images/flower-ingame-384.webp 384w,
              /images/flower-ingame-512.webp 512w,
              /images/flower-ingame-720.webp 720w
            "
            :class="{
              'object-contain w-full h-full [animation-fill-mode:forwards]': true,
              'animate-spin [animation-duration:60s]': animate,
            }"
            width="720"
            height="720"
            sizes="(min-width: 768px) 50vh, 12.5vh"
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
