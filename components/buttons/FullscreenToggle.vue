<template>
  <!-- Fullscreen Toggle Button 
    This button toggles fullscreen mode when clicked.
    It is only visible if fullscreen is supported in the browser 
    and the allowFullscreen option is enabled in the config store.
  -->
  <button
    v-if="isSupported && allowFullscreen"
    title="Toggle Fullscreen"
    :class="[
      'inline-flex w-full justify-center gap-x-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold',
      'drop-shadow-md text-white',
    ]"
    type="button"
    @click="toggle"
  >
    <Icon
      v-if="!isFullscreen"
      class="w-8 h-8 drop-shadow-sm"
      name="mdi:fullscreen"
    />
    <Icon
      v-else
      class="w-8 h-8 drop-shadow-sm"
      name="mdi:fullscreen-exit"
    />
    <span class="sr-only">Toggle Fullscreen</span>
  </button>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFullscreen } from '@vueuse/core'
import { useConfigStore } from '~/stores/configStore'

const { isFullscreen, toggle, enter, exit, isSupported } = useFullscreen(undefined, {
  autoExit: true,
})
const { allowFullscreen } = storeToRefs(useConfigStore())

onMounted(async () => {
  if (!isSupported.value) {
    console.warn('Fullscreen is not supported in this browser.')
  }
  // Toggle fullscreen when allowFullscreen option changes in the store
  watch(allowFullscreen, () => {
    allowFullscreen.value ? enter() : exit()
  })
})
</script>
