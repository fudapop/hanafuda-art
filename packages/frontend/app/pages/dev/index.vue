<template>
  <div
    v-if="isDev"
    class="max-w-2xl mx-auto px-4 py-8"
  >
    <h1 class="text-2xl font-bold mb-6">Dev Test Scenarios</h1>
    <div class="flex flex-col gap-3">
      <button
        v-for="(scenario, key) in DEV_SCENARIOS"
        :key="key"
        class="sec-btn flex justify-between text-left px-4 py-3"
        @click="applyScenario(scenario)"
      >
        <div class="font-semibold basis-1/2">{{ scenario.label }}</div>
        <div class="text-sm opacity-70 basis-1/2">{{ scenario.description }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DEV_SCENARIOS } from '~/utils/dev-scenarios'

const isDev = import.meta.dev

if (!isDev) {
  navigateTo('/', { replace: true })
}

const { applyScenario } = useDevScenario()
</script>
