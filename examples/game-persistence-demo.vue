<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Game Persistence Demo</h1>
    
    <!-- Current Profile Info -->
    <div class="mb-6 p-4 bg-gray-100 rounded-lg">
      <h2 class="text-lg font-semibold mb-2">Current Profile</h2>
      <p v-if="currentProfile">
        <strong>User:</strong> {{ currentProfile.username }} ({{ currentProfile.uid.slice(0, 8) }}...)
        <br>
        <strong>Type:</strong> {{ currentProfile.isGuest ? 'Guest' : 'Registered' }}
      </p>
      <p v-else class="text-gray-500">No profile loaded</p>
    </div>

    <!-- Save Status -->
    <div class="mb-6 p-4 bg-blue-100 rounded-lg">
      <h2 class="text-lg font-semibold mb-2">Save Status</h2>
      <p v-if="!isSupported" class="text-red-600">IndexedDB not supported in this browser</p>
      <p v-else-if="loading" class="text-blue-600">Checking for saves...</p>
      <p v-else-if="hasSave" class="text-green-600">✓ Save found for this profile</p>
      <p v-else class="text-gray-600">No save found for this profile</p>
      
      <div v-if="currentSave" class="mt-2 text-sm text-gray-700">
        <strong>Save Details:</strong><br>
        Round {{ currentSave.preview.round }}, Turn {{ currentSave.preview.turn }}<br>
        Score: P1: {{ currentSave.preview.score.p1 }} | P2: {{ currentSave.preview.score.p2 }}<br>
        <em>{{ formatDate(currentSave.timestamp) }}</em>
      </div>
    </div>

    <!-- Actions -->
    <div class="space-y-4">
      <div class="flex gap-4">
        <button
          @click="testSave"
          :disabled="!isSupported || saving"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Create Test Save' }}
        </button>
        
        <button
          v-if="hasSave"
          @click="loadSave"
          :disabled="!isSupported || loadingGame"
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {{ loadingGame ? 'Loading...' : 'Load Save' }}
        </button>
        
        <button
          v-if="hasSave"
          @click="deleteSave"
          :disabled="!isSupported || deletingGame"
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {{ deletingGame ? 'Deleting...' : 'Delete Save' }}
        </button>
      </div>
      
      <div class="text-sm text-gray-600">
        <p><strong>Profile-specific saves:</strong> Each user profile gets one save slot.</p>
        <p><strong>Switch profiles:</strong> Log out and back in as a different user to test isolation.</p>
        <p><strong>Guest vs Registered:</strong> Guest saves use session storage, registered users use permanent storage.</p>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      <strong>Error:</strong> {{ error.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
// Profile system
const { current: currentProfile } = useProfile()

// Game persistence
const {
  isSupported,
  error,
  saveGame,
  loadCurrentProfileGame,
  hasCurrentProfileSave,
  getCurrentProfileSave,
  deleteCurrentProfileSave
} = useGamePersistence()

// Local state
const loading = ref(false)
const saving = ref(false)
const loadingGame = ref(false)
const deletingGame = ref(false)
const hasSave = ref(false)
const currentSave = ref(null)

// Check for save state
const checkSaveState = async () => {
  if (!isSupported.value || !currentProfile.value) {
    hasSave.value = false
    currentSave.value = null
    return
  }

  try {
    loading.value = true
    hasSave.value = await hasCurrentProfileSave()
    if (hasSave.value) {
      currentSave.value = await getCurrentProfileSave()
    } else {
      currentSave.value = null
    }
  } catch (err) {
    console.error('Failed to check save state:', err)
    hasSave.value = false
    currentSave.value = null
  } finally {
    loading.value = false
  }
}

// Create a test save with mock game data
const testSave = async () => {
  try {
    saving.value = true
    
    // Mock some game state for demonstration
    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()
    
    // Set up minimal game state for testing
    cardStore.dealCards()
    gameDataStore.nextPhase()
    
    await saveGame('Demo Save')
    await checkSaveState()
  } catch (err) {
    console.error('Failed to create test save:', err)
  } finally {
    saving.value = false
  }
}

// Load the current save
const loadSave = async () => {
  try {
    loadingGame.value = true
    await loadCurrentProfileGame()
    console.log('Game loaded successfully')
  } catch (err) {
    console.error('Failed to load save:', err)
  } finally {
    loadingGame.value = false
  }
}

// Delete the current save
const deleteSave = async () => {
  if (!confirm('Are you sure you want to delete this save?')) {
    return
  }
  
  try {
    deletingGame.value = true
    await deleteCurrentProfileSave()
    await checkSaveState()
  } catch (err) {
    console.error('Failed to delete save:', err)
  } finally {
    deletingGame.value = false
  }
}

// Utility function
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

// Watch for profile changes
watch(currentProfile, checkSaveState, { immediate: true })

// Initial check
onMounted(checkSaveState)
</script>

<style scoped>
/* Add any specific styling if needed */
</style>