<template>
  <div class="flex flex-col items-center gap-4 px-4 py-6 mx-2 border-t bg-surface border-t-border">
    <h3 class="text-lg font-semibold text-text">Game State Management</h3>

    <div class="flex flex-wrap items-center justify-center gap-3">
      <button
        class="px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        @click="handleQuickSave"
        :disabled="isSaving"
      >
        {{ isSaving ? 'Saving...' : 'Quick Save' }}
      </button>

      <button
        class="px-4 py-2 text-sm font-medium transition-colors border rounded-md border-border bg-background text-text hover:bg-surface"
        @click="handleQuickLoad"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Loading...' : 'Quick Load' }}
      </button>

      <button
        class="px-4 py-2 text-sm font-medium transition-colors border rounded-md border-border bg-background text-text hover:bg-surface"
        @click="handleExportGame"
      >
        Export Game
      </button>

      <label
        class="px-4 py-2 text-sm font-medium transition-colors border rounded-md cursor-pointer border-border bg-background text-text hover:bg-surface"
      >
        Import Game
        <input
          type="file"
          accept=".json"
          class="hidden"
          @change="handleImportGame"
        />
      </label>
    </div>

    <div
      v-if="savedGames.length > 0"
      class="w-full"
    >
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium text-text-secondary">Saved Games</h4>
        <button
          class="px-2 py-1 text-xs font-medium text-red-600 transition-colors border border-red-300 rounded-sm hover:bg-red-50 hover:border-red-400"
          @click="handleClearAllSaves"
          title="Delete all saved games"
        >
          Clear All
        </button>
      </div>
      <div class="flex flex-col gap-2">
        <div
          v-for="save in savedGames.slice(0, 5)"
          :key="save.key"
          class="flex items-center justify-between gap-2 p-2 border rounded-sm border-border bg-background"
        >
          <div class="flex flex-col flex-1 min-w-0">
            <span class="text-xs font-medium truncate text-text"> Game: {{ save.gameId }} </span>
            <span class="text-xs text-text-secondary">
              {{ new Date(save.timestamp).toLocaleString() }}
            </span>
          </div>
          <div class="flex gap-1">
            <button
              class="px-2 py-1 text-xs font-medium transition-colors border rounded-sm border-border bg-background text-text hover:bg-surface"
              @click="handleLoadSave(save.key)"
              title="Load this save"
            >
              Load
            </button>
            <button
              class="px-2 py-1 text-xs font-medium text-red-600 transition-colors border border-red-300 rounded-sm hover:bg-red-50 hover:border-red-400"
              @click="handleDeleteSave(save.key)"
              title="Delete this save"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="statusMessage"
      class="text-sm"
      :class="statusMessageClass"
    >
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
// Game State Management
const {
  quickSave,
  quickLoad,
  exportGameState,
  importGameState,
  listSavedGames,
  loadGameFromStorage,
  deleteSavedGame,
} = useStoreManager()

const isSaving = ref(false)
const isLoading = ref(false)
const statusMessage = ref('')
const statusMessageClass = ref('text-text-secondary')

const savedGames = ref<Array<{ key: string; timestamp: number; gameId: string }>>([])

// Polling state
const isPolling = ref(true)
const pollingInProgress = ref(false)

// Polling loop for saved games
const pollSavedGames = async () => {
  while (isPolling.value) {
    if (!pollingInProgress.value) {
      pollingInProgress.value = true
      try {
        savedGames.value = await listSavedGames()
      } catch (error) {
        console.error('Failed to poll saved games:', error)
      } finally {
        pollingInProgress.value = false
      }
    }
    await sleep(5000)
  }
}

onMounted(async () => {
  // Initial load
  savedGames.value = await listSavedGames()
  // Start polling
  pollSavedGames()
})

onUnmounted(() => {
  isPolling.value = false
})

const showStatus = (message: string, isError = false, isWarning = false) => {
  statusMessage.value = message
  if (isError) {
    statusMessageClass.value = 'text-red-500'
  } else if (isWarning) {
    statusMessageClass.value = 'text-yellow-500'
  } else {
    statusMessageClass.value = 'text-green-500'
  }

  setTimeout(
    () => {
      statusMessage.value = ''
    },
    isWarning ? 5000 : 3000,
  ) // Show warnings longer
}

const handleQuickSave = async () => {
  isSaving.value = true
  try {
    const saveKey = await quickSave()
    savedGames.value = await listSavedGames()
    showStatus('Game saved successfully!')
  } catch (error) {
    console.error('Save failed:', error)
    showStatus('Failed to save game', true)
  } finally {
    isSaving.value = false
  }
}

const handleQuickLoad = async () => {
  isLoading.value = true
  try {
    const success = await quickLoad()
    if (success) {
      showStatus('Game loaded successfully!')
    } else {
      showStatus('No saved game found', true)
    }
  } catch (error: any) {
    console.error('Load failed:', error)
    if (error.message?.includes('integrity')) {
      showStatus('Load failed: Save data may have been tampered with', true)
    } else {
      showStatus('Failed to load game', true)
    }
  } finally {
    isLoading.value = false
  }
}

const handleLoadSave = async (saveKey: string) => {
  isLoading.value = true
  try {
    const success = await loadGameFromStorage(saveKey)
    if (success) {
      showStatus('Game loaded successfully!')
    } else {
      showStatus('Failed to load selected save', true)
    }
  } catch (error: any) {
    console.error('Load failed:', error)
    if (error.message?.includes('integrity')) {
      showStatus('Load failed: Save data may have been tampered with', true)
    } else {
      showStatus('Failed to load game', true)
    }
  } finally {
    isLoading.value = false
  }
}

const handleDeleteSave = async (saveKey: string) => {
  // Find the save to show confirmation details
  const save = savedGames.value.find((s) => s.key === saveKey)
  const saveDate = save ? new Date(save.timestamp).toLocaleString() : 'Unknown'

  if (confirm(`Delete save from ${saveDate}?\n\nThis action cannot be undone.`)) {
    try {
      const success = await deleteSavedGame(saveKey)
      if (success) {
        savedGames.value = await listSavedGames() // Refresh the list
        showStatus('Save deleted successfully!')
      } else {
        showStatus('Failed to delete save', true)
      }
    } catch (error) {
      console.error('Delete failed:', error)
      showStatus('Failed to delete save', true)
    }
  }
}

const handleClearAllSaves = async () => {
  const saveCount = savedGames.value.length

  if (confirm(`Delete all ${saveCount} saved games?\n\nThis action cannot be undone.`)) {
    try {
      let deletedCount = 0
      for (const save of savedGames.value) {
        if (await deleteSavedGame(save.key)) {
          deletedCount++
        }
      }

      savedGames.value = await listSavedGames() // Refresh the list
      if (deletedCount === saveCount) {
        showStatus(`All ${saveCount} saves deleted successfully!`)
      } else if (deletedCount > 0) {
        showStatus(`Deleted ${deletedCount} of ${saveCount} saves`, false, true)
      } else {
        showStatus('Failed to delete saves', true)
      }
    } catch (error) {
      console.error('Clear all failed:', error)
      showStatus('Failed to delete saves', true)
    }
  }
}

const handleExportGame = async () => {
  try {
    await exportGameState()
    showStatus('Game exported successfully!')
  } catch (error) {
    console.error('Export failed:', error)
    showStatus('Failed to export game', true)
  }
}

const handleImportGame = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const success = await importGameState(file)
    if (success) {
      showStatus('Game imported successfully!')
    } else {
      showStatus('Failed to import game', true)
    }
  } catch (error: any) {
    console.error('Import failed:', error)
    if (error.message?.includes('integrity')) {
      showStatus('Import failed: File may have been tampered with', true)
    } else {
      showStatus('Failed to import game', true)
    }
  }

  // Reset the input
  target.value = ''
}
</script>
