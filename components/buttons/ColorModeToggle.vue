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
import { useColorMode, useCycleList } from '@vueuse/core'

const mode = useColorMode({
  emitAuto: true,
})

const { state, next } = useCycleList(['dark', 'light', 'auto'], { initialValue: mode.value })

const handleClick = () => {
  next()
}

watchEffect(() => {
  mode.value = state.value as any
})
</script>
