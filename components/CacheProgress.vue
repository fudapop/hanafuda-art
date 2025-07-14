<template>
  <div
    v-if="cacheInProgress"
    class="fixed max-w-sm p-4 bg-white border rounded-lg shadow-lg bottom-4 right-4 dark:bg-gray-800"
  >
    <div class="flex items-center space-x-3">
      <div class="w-4 h-4 border-b-2 border-blue-500 rounded-full animate-spin"></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
          {{ currentOperation }}
        </p>
        <div class="w-full h-2 mt-1 bg-gray-200 rounded-full">
          <div
            class="h-2 transition-all duration-300 bg-blue-500 rounded-full"
            :style="{ width: `${cacheProgress}%` }"
          ></div>
        </div>
        <p class="mt-1 text-xs text-gray-500">{{ cacheProgress }}% complete</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCardCache } from '~/composables/useCardCache'

const { cacheInProgress, cacheProgress, currentOperation } = useCardCache()
</script>
