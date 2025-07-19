/**
 * Utility functions for integrating game persistence with the Hanafuda game flow
 */

import { useGamePersistence } from '~/composables/useGamePersistence'
import { useGameDataStore } from '~/stores/gameDataStore'
import { useToast } from 'vue-toastification'

// Auto-save intervals and triggers
export const AUTO_SAVE_INTERVAL = 30000 // 30 seconds
export const AUTO_SAVE_ON_TURN_CHANGE = true
export const AUTO_SAVE_ON_ROUND_END = true

/**
 * Sets up automatic game saving based on game events
 */
export const setupAutoSave = () => {
  const { autoSave, isSupported } = useGamePersistence()
  const gameDataStore = useGameDataStore()
  const toast = useToast()

  if (!isSupported.value) {
    console.warn('Auto-save not available: IndexedDB not supported')
    return { stop: () => {} }
  }

  let autoSaveTimer: NodeJS.Timeout | null = null
  let stopWatchers: (() => void)[] = []

  // Periodic auto-save
  const startPeriodicAutoSave = () => {
    autoSaveTimer = setInterval(async () => {
      try {
        const saveId = await autoSave()
        if (saveId) {
          console.debug('Auto-save successful:', saveId)
        }
      } catch (error) {
        console.warn('Auto-save failed:', error)
      }
    }, AUTO_SAVE_INTERVAL)
  }

  // Auto-save on turn changes
  if (AUTO_SAVE_ON_TURN_CHANGE) {
    const stopTurnWatcher = watch(
      () => gameDataStore.turnCounter,
      async (newTurn, oldTurn) => {
        if (oldTurn && newTurn > oldTurn) {
          try {
            await autoSave()
          } catch (error) {
            console.warn('Turn auto-save failed:', error)
          }
        }
      }
    )
    stopWatchers.push(stopTurnWatcher)
  }

  // Auto-save on round end
  if (AUTO_SAVE_ON_ROUND_END) {
    const stopRoundWatcher = watch(
      () => gameDataStore.roundOver,
      async (roundOver) => {
        if (roundOver) {
          try {
            const saveId = await autoSave()
            if (saveId) {
              toast.success('Game progress saved automatically')
            }
          } catch (error) {
            console.warn('Round end auto-save failed:', error)
          }
        }
      }
    )
    stopWatchers.push(stopRoundWatcher)
  }

  startPeriodicAutoSave()

  // Return cleanup function
  const stop = () => {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
    stopWatchers.forEach(stop => stop())
    stopWatchers = []
  }

  return { stop }
}

/**
 * Shows a save confirmation dialog with options
 */
export const showSaveDialog = async (): Promise<{ action: 'save' | 'cancel'; name?: string }> => {
  return new Promise((resolve) => {
    // This would integrate with your existing UI system
    // For now, using a simple prompt
    const name = prompt('Enter a name for this save (or leave empty for auto-generated name):')
    
    if (name !== null) {
      resolve({ action: 'save', name: name.trim() || undefined })
    } else {
      resolve({ action: 'cancel' })
    }
  })
}

/**
 * Handles the save game flow with user feedback
 */
export const handleSaveGameFlow = async (customName?: string) => {
  const { saveGame, isSupported } = useGamePersistence()
  const toast = useToast()

  if (!isSupported.value) {
    toast.error('Save feature not available in this browser')
    return null
  }

  try {
    let saveName = customName
    
    if (!saveName) {
      const result = await showSaveDialog()
      if (result.action === 'cancel') {
        return null
      }
      saveName = result.name
    }

    const saveId = await saveGame(saveName || `Save ${new Date().toLocaleString()}`)
    toast.success('Game saved successfully!')
    return saveId
  } catch (error) {
    console.error('Save failed:', error)
    toast.error('Failed to save game. Please try again.')
    throw error
  }
}

/**
 * Handles the load game flow with user feedback
 */
export const handleLoadGameFlow = async (saveId: string) => {
  const { loadGame, isSupported } = useGamePersistence()
  const toast = useToast()

  if (!isSupported.value) {
    toast.error('Load feature not available in this browser')
    return false
  }

  try {
    await loadGame(saveId)
    toast.success('Game loaded successfully!')
    return true
  } catch (error) {
    console.error('Load failed:', error)
    toast.error('Failed to load game. The save file may be corrupted.')
    throw error
  }
}

/**
 * Checks if there are any saved games available for current profile
 */
export const hasSavedGames = async (): Promise<boolean> => {
  const { hasCurrentProfileSave, isSupported } = useGamePersistence()
  
  if (!isSupported.value) {
    return false
  }

  try {
    return await hasCurrentProfileSave()
  } catch (error) {
    console.warn('Failed to check for saved games:', error)
    return false
  }
}

/**
 * Gets the current profile's save for quick resume functionality
 */
export const getMostRecentSave = async () => {
  const { getCurrentProfileSave, isSupported } = useGamePersistence()
  
  if (!isSupported.value) {
    return null
  }

  try {
    return await getCurrentProfileSave()
  } catch (error) {
    console.warn('Failed to get profile save:', error)
    return null
  }
}

/**
 * Validates game state before allowing save
 */
export const canSaveGame = (): { canSave: boolean; reason?: string } => {
  const gameDataStore = useGameDataStore()
  const { isSupported } = useGamePersistence()

  if (!isSupported.value) {
    return { canSave: false, reason: 'IndexedDB not supported in this browser' }
  }

  if (gameDataStore.gameOver) {
    return { canSave: false, reason: 'Cannot save completed games' }
  }

  if (gameDataStore.turnCounter === 1 && gameDataStore.roundCounter === 1) {
    return { canSave: false, reason: 'Game has not started yet' }
  }

  return { canSave: true }
}

/**
 * Integration with PWA install prompt
 */
export const setupPWASaveIntegration = () => {
  // Listen for PWA install events and suggest save feature
  let deferredPrompt: any = null

  window.addEventListener('beforeinstallprompt', (e) => {
    deferredPrompt = e
    e.preventDefault()
    
    // You could show a custom UI here suggesting the save feature
    // along with PWA installation
  })

  const promptInstallWithSaveFeature = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        const toast = useToast()
        toast.info('Great! Now you can save your games offline.')
      }
      
      deferredPrompt = null
    }
  }

  return { promptInstallWithSaveFeature }
}

/**
 * Export save data for sharing or backup
 */
export const exportSaveData = async (saveId: string): Promise<Blob> => {
  const { getSavedGames } = useGamePersistence()
  
  // This is a simplified version - you'd need to modify the composable
  // to expose the raw save data for export functionality
  const saves = await getSavedGames()
  const save = saves.find(s => s.id === saveId)
  
  if (!save) {
    throw new Error('Save not found')
  }

  const exportData = {
    version: '2.1.0',
    exportedAt: new Date().toISOString(),
    gameData: save // This would need the full save data, not just the slot
  }

  return new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  })
}

/**
 * Cleanup old saves to manage storage space
 */
export const cleanupOldSaves = async (maxSaves: number = 20) => {
  const { getSavedGames, deleteSave } = useGamePersistence()
  
  try {
    const saves = await getSavedGames()
    
    if (saves.length > maxSaves) {
      const savesToDelete = saves.slice(maxSaves) // Keep newest maxSaves
      
      for (const save of savesToDelete) {
        await deleteSave(save.id)
      }
      
      console.log(`Cleaned up ${savesToDelete.length} old saves`)
    }
  } catch (error) {
    console.warn('Failed to cleanup old saves:', error)
  }
}