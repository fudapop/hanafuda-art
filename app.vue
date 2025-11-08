<template>
  <NuxtLayout>
    <div class="absolute inset-x-0 z-50 mx-auto pointer-events-none top-1/3 w-max">
      <Transition
        appear
        enter-active-class="duration-300"
        enter-to-class="opacity-100"
        enter-from-class="opacity-0"
        leave-active-class="duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <SakuraLoader v-if="loading" />
      </Transition>
    </div>
    <SystemOptionsPopover />
    <NuxtPwaManifest />
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import Toast, { POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { vClickDisabled } from '~/utils/directives/vClickDisabled'
import { vHide } from '~/utils/directives/vHide'

const loading = ref(false)
const nuxtApp = useNuxtApp()
const vueApp = nuxtApp.vueApp

vueApp.directive('hide', vHide)
vueApp.directive('click-disabled', vClickDisabled)

vueApp.use(Toast, {
  position: POSITION.TOP_CENTER,
  timeout: 2000,
  transition: 'Vue-Toastification__bounce',
  maxToasts: 20,
  newestOnTop: true,
})

nuxtApp.hook('page:start', () => {
  loading.value = true
})

nuxtApp.hook('page:finish', () => {
  loading.value = false
})

// Initialize audio
const audio = useAudio()

// Provide audio instance via Nuxt for cross-plugin and component access
nuxtApp.provide('audio', audio)

onMounted(async () => {
  // Initialize audio with background music
  audio.initAudio(audio.BGM.main)

  // Setup autoplay after user interaction
  audio.setupAutoplay()

  // Preload
  audio.preloadAudioCache()
})
</script>
