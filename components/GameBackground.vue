<template>
  <div class="relative w-full h-full min-h-screen overflow-hidden isolate -z-50">
    <!-- Background -->
    <div
      class="absolute inset-0 -z-10 dark:after:content-[''] dark:after:absolute dark:after:inset-0 dark:bg-brown-500/50"
    >
      <img
        src="~/assets/images/bg-ingame.png"
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
        v-if="gameIsStarted"
        class="fixed top-0 left-0 right-0 z-10"
      >
        <div class="static h-28">
          <img
            src="~/assets/images/player_bar.png"
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
        v-if="gameIsStarted"
        class="fixed bottom-0 left-0 right-0 z-10"
      >
        <div class="static h-28">
          <img
            src="~/assets/images/player_bar_bottom.png"
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
      <div
        class="bottom-0 left-0 transition-all origin-left -translate-x-1/2 flower-ornament lg:-translate-y-1/2 dark:invert dark:grayscale"
      >
        <img
          src="~/assets/images/flower_ingame.png"
          :class="{
            'object-contain w-full h-full [animation-fill-mode:forwards]': true,
            'animate-spin [animation-duration:60s]': koikoiIsCalled,
          }"
          alt="Decorative flower"
        />
      </div>
      <div
        class="top-0 right-0 transition-all origin-right translate-x-1/2 flower-ornament lg:translate-y-1/2 dark:invert dark:grayscale"
      >
        <img
          src="~/assets/images/flower_ingame.png"
          :class="{
            'object-contain w-full h-full [animation-fill-mode:forwards]': true,
            'animate-spin [animation-duration:60s]': koikoiIsCalled,
          }"
          alt="Decorative flower"
        />
      </div>

      <!-- Main content slot -->
      <div class="relative z-10 w-full h-full">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { noCalls, koikoiIsCalled } = useDecisionHandler()
const gameIsStarted = useState('start', () => false)
const { index = 1 } = defineProps<{ index?: number }>()
// const bgIndex = index
// const bgImages = [
//   {
//     src: '/bg/grey-hills-1280.webp',
//     srcset:
//       '/bg/grey-hills-768.webp 768w, /bg/grey-hills-1024.webp 1024w, /bg/grey-hills-1280.webp 1280w, /bg/grey-hills-1920.webp 1920w',
//     alt: 'Full moon over grey hills',
//   },
//   {
//     src: '/bg/crane-man-1280.webp',
//     srcset:
//       '/bg/crane-man-768.webp 768w, /bg/crane-man-1024.webp 1024w, /bg/crane-man-1280.webp 1280w, /bg/crane-man-1440.webp 1440w, /bg/crane-man-1920.webp 1920w',
//     alt: 'Crane, Butterfly & Rain-Man',
//   },
// ]
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
