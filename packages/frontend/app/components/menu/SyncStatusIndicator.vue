<template>
  <div class="flex items-center gap-2 text-sm">
    <div
      class="w-2 h-2 rounded-full transition-colors"
      :class="{
        'bg-green-500': status === 'idle' && !hasPendingChanges,
        'bg-yellow-500 animate-pulse':
          status === 'pulling' || status === 'pushing' || status === 'syncing',
        'bg-red-500': status === 'error',
        'bg-gray-400': status === 'idle' && hasPendingChanges,
      }"
    />
    <span class="text-xs text-gray-600 dark:text-gray-400">
      {{ statusText }}
    </span>
    <button
      v-if="status === 'error' || hasPendingChanges"
      @click="retrySync"
      class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
    >
      {{ t('common.actions.retry') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProfile } from '~/composables/useProfile'
import type { SyncMetadata } from '~/types/profile'

const { t } = useI18n()
const { syncStatus, sync, getSyncMetadata } = useProfile()

const metadata = ref<SyncMetadata | null>(null)

const status = computed(() => syncStatus.value)
const hasPendingChanges = computed(() => metadata.value?.pendingChanges ?? false)

const statusText = computed(() => {
  switch (status.value) {
    case 'idle':
      return hasPendingChanges.value ? t('profile.sync.pendingChanges') : t('profile.sync.synced')
    case 'pulling':
      return t('profile.sync.syncing')
    case 'pushing':
      return t('profile.sync.syncing')
    case 'syncing':
      return t('profile.sync.syncing')
    case 'error':
      return metadata.value?.lastSyncError || t('profile.sync.error')
    default:
      return 'Unknown'
  }
})

const retrySync = async () => {
  try {
    await sync()
    metadata.value = await getSyncMetadata()
  } catch (error) {
    console.error('Sync retry error:', error)
    // Show user feedback if available (could emit an event or use toast)
  }
}

// Refresh metadata periodically with guard against overlapping calls
let intervalId: ReturnType<typeof setInterval> | null = null
let isPollingInProgress = false

const pollSyncMetadata = async () => {
  if (isPollingInProgress) return

  try {
    isPollingInProgress = true
    metadata.value = await getSyncMetadata()
  } catch (error) {
    console.error('Error polling sync metadata:', error)
  } finally {
    isPollingInProgress = false
  }
}

onMounted(async () => {
  // Initial load
  try {
    metadata.value = await getSyncMetadata()
  } catch (error) {
    console.error('Error loading initial sync metadata:', error)
  }

  // Start polling
  intervalId = setInterval(pollSyncMetadata, 5000)
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>
