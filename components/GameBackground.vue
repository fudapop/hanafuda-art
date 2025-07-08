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
import { storeToRefs } from 'pinia'
import mainTheme from '~/assets/audio/PerituneMaterial_Awayuki.ogg'
import koikoiTheme from '~/assets/audio/PerituneMaterial_EpicBattle_J_loop.ogg'
import { useGameDataStore } from '~/stores/gameDataStore'

const { koikoiIsCalled } = useDecisionHandler()

const { roundCounter } = storeToRefs(useGameDataStore())

const gameIsStarted = useState('start', () => false)

const { fetchCardUrls, useDesign } = useCardDesign()
const currentDesign = useDesign()

const preloadHead = useHead({})

const preloadImages = () => {
  fetchCardUrls().then((urlMap) => {
    const preloadTags = [...urlMap.values()].map((url) => ({
      rel: 'preload',
      href: url,
      as: 'image' as const,
    }))
    preloadHead?.patch({
      link: preloadTags,
    })
  })
}

const cleanupPreload = watch(currentDesign, () => {
  preloadImages()
})

const audio = inject('audio') as ReturnType<typeof useAudio>

const cleanupAudio = watch(
  [koikoiIsCalled, roundCounter, gameIsStarted],
  ([newCall, newRound], [_, oldRound]) => {
    if (newCall) {
      // Koi-koi was called
      audio.crossfadeTo(koikoiTheme, 0.2)
    } else if (newRound > oldRound) {
      // New round started
      audio.crossfadeTo(mainTheme, 3)
    }
  },
)

onMounted(() => {
  preloadImages()
})

onUnmounted(() => {
  // Left the game screen
  audio.crossfadeTo?.(mainTheme, 3)
  cleanupAudio()
  cleanupPreload()
})
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
