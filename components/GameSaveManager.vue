<template>
  <div class="game-save-manager">
    <!-- Save Section -->
    <div class="save-section mb-6">
      <h3 class="text-lg font-semibold mb-4">Save Game</h3>
      <div class="flex gap-2 mb-2">
        <input
          v-model="saveSlotName"
          type="text"
          placeholder="Save name (optional)"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="handleSaveGame"
          :disabled="!isSupported || saving"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saving ? 'Saving...' : 'Save Game' }}
        </button>
      </div>
      <button
        @click="handleAutoSave"
        :disabled="!isSupported || autoSaving"
        class="text-sm text-blue-600 hover:underline"
      >
        {{ autoSaving ? 'Auto-saving...' : 'Quick Save' }}
      </button>
    </div>

    <!-- Load Section -->
    <div class="load-section">
      <h3 class="text-lg font-semibold mb-4">Load Game</h3>
      
      <div v-if="loading" class="text-center py-4">
        Loading saved game...
      </div>
      
      <div v-else-if="!currentSave" class="text-gray-500 text-center py-4">
        No saved game found for this profile
      </div>
      
      <div v-else class="space-y-2">
        <div class="save-slot flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
          <div class="save-info flex-1">
            <div class="font-medium">Current Profile Save</div>
            <div class="text-sm text-gray-500">
              Round {{ currentSave.preview.round }}, Turn {{ currentSave.preview.turn }} ({{ currentSave.preview.phase }})
            </div>
            <div class="text-xs text-gray-400">
              Score: P1: {{ currentSave.preview.score.p1 }} | P2: {{ currentSave.preview.score.p2 }}
            </div>
            <div class="text-xs text-gray-400">
              {{ formatDate(currentSave.timestamp) }}
            </div>
          </div>
          
          <div class="save-actions flex gap-2">
            <button
              @click="handleLoadGame"
              :disabled="loadingGame"
              class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {{ loadingGame ? 'Loading...' : 'Load' }}
            </button>
            <button
              @click="handleDeleteSave"
              :disabled="deletingGame"
              class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {{ deletingGame ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-section mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      <strong>Error:</strong> {{ error.message }}
    </div>

    <!-- Debug Section (remove in production) -->
    <div class="debug-section mt-6 p-3 bg-gray-100 rounded text-xs">
      <div>IndexedDB Supported: {{ isSupported }}</div>
      <div>Database Initialized: {{ isInitialized }}</div>
      <div>Auto-save available: {{ autoSaveAvailable }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SaveSlot {
  id: string
  name: string
  timestamp: number
  preview: {
    round: number
    turn: number
    phase: string
    score: { p1: number; p2: number }
  }
}

const {
  isSupported,
  isInitialized,
  error,
  saveGame,
  loadCurrentProfileGame,
  hasCurrentProfileSave,
  getCurrentProfileSave,
  deleteCurrentProfileSave,
  autoSave
} = useGamePersistence()

// Reactive state
const saveSlotName = ref('')
const currentSave = ref<SaveSlot | null>(null)
const saving = ref(false)
const autoSaving = ref(false)
const loading = ref(false)
const loadingGame = ref(false)
const deletingGame = ref(false)

// Computed
const autoSaveAvailable = computed(() => {
  const gameDataStore = useGameDataStore()
  return !gameDataStore.gameOver && gameDataStore.turnCounter > 1
})

// Methods
const handleSaveGame = async () => {
  try {
    saving.value = true
    const saveName = saveSlotName.value.trim() || `Manual Save ${new Date().toLocaleString()}`
    await saveGame(saveName)
    saveSlotName.value = ''
    await refreshCurrentSave()
  } catch (err) {
    console.error('Failed to save game:', err)
  } finally {
    saving.value = false
  }
}

const handleAutoSave = async () => {
  try {
    autoSaving.value = true
    await autoSave()
    await refreshCurrentSave()
  } catch (err) {
    console.error('Auto-save failed:', err)
  } finally {
    autoSaving.value = false
  }
}

const handleLoadGame = async () => {
  try {
    loadingGame.value = true
    await loadCurrentProfileGame()
    // Optionally emit an event or navigate to game screen
    await refreshCurrentSave()
  } catch (err) {
    console.error('Failed to load game:', err)
  } finally {
    loadingGame.value = false
  }
}

const handleDeleteSave = async () => {
  if (!confirm('Are you sure you want to delete this save?')) {
    return
  }
  
  try {
    deletingGame.value = true
    await deleteCurrentProfileSave()
    await refreshCurrentSave()
  } catch (err) {
    console.error('Failed to delete save:', err)
  } finally {
    deletingGame.value = false
  }
}

const refreshCurrentSave = async () => {
  try {
    loading.value = true
    const hasSave = await hasCurrentProfileSave()
    if (hasSave) {
      currentSave.value = await getCurrentProfileSave()
    } else {
      currentSave.value = null
    }
  } catch (err) {
    console.error('Failed to load current save:', err)
    currentSave.value = null
  } finally {
    loading.value = false
  }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

// Initialize
onMounted(async () => {
  if (isSupported.value) {
    await refreshCurrentSave()
  }
})

// Watch for initialization
watch(isInitialized, async (initialized) => {
  if (initialized) {
    await refreshCurrentSave()
  }
})

// Watch for profile changes
const { current: currentProfile } = useProfile()
watch(currentProfile, async () => {
  await refreshCurrentSave()
}, { immediate: true })
</script>

<style scoped>
.game-save-manager {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

.save-slot:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}
</style>