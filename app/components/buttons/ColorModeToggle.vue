<!-- Color Mode Toggle Button 
    This button toggles the color mode when clicked.
    It cycles between dark, light, and auto modes.
  -->
<template>
  <button
    @click="handleClick"
    title="Toggle Color Mode"
    :class="[
      'inline-flex w-full justify-center gap-x-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold ',
      'drop-shadow-md text-white dark:hover:text-yellow-300 hover:text-indigo-600',
    ]"
  >
    <Icon
      v-if="state === 'dark'"
      name="ic:outline-dark-mode"
      class="w-6 h-6 drop-shadow-sm"
    />
    <Icon
      v-else-if="state === 'light'"
      name="ic:outline-light-mode"
      class="w-6 h-6 drop-shadow-sm"
    />
    <Icon
      v-else
      name="ic:round-monitor"
      class="w-6 h-6 drop-shadow-sm hover:text-yellow-300"
    />
    <span class="sr-only">{{ state }}</span>
  </button>
</template>

<script setup lang="ts">
import { useColorMode, useCycleList, useStorage } from '@vueuse/core'

type ColorMode = 'auto' | 'dark' | 'light'

const mode = useColorMode({
  emitAuto: true,
})

// Sync with system preferences storage (used by SystemOptionsPopover)
const systemPreferences = useStorage('hanafuda-system-preferences', {
  colorMode: 'auto' as ColorMode,
  fullscreen: false,
})

// Initialize state from system preferences or VueUse storage
const initialValue = systemPreferences.value.colorMode || mode.value || 'auto'
const { state, next } = useCycleList<ColorMode>(['dark', 'light', 'auto'], {
  initialValue: initialValue as ColorMode,
})

const handleClick = () => {
  next()
}

// Watch for color mode changes and sync to both storage systems
watchEffect(() => {
  const newMode = state.value as ColorMode
  mode.value = newMode as any
  systemPreferences.value.colorMode = newMode

  // Dispatch custom event for plugin to sync immediately
  if (process.client) {
    window.dispatchEvent(new CustomEvent('color-mode-change'))
    
    // Also apply directly to HTML element for immediate effect in PWA
    const html = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (newMode === 'dark' || (newMode === 'auto' && prefersDark)) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
})

// Sync initial state from storage on mount
onMounted(() => {
  if (systemPreferences.value.colorMode && systemPreferences.value.colorMode !== state.value) {
    const targetMode = systemPreferences.value.colorMode
    // Set mode value directly
    mode.value = targetMode as any
    
    // Update cycle list to sync with target mode (max 2 iterations)
    let attempts = 0
    while (state.value !== targetMode && attempts < 3) {
      next()
      attempts++
    }
  }
})
</script>
