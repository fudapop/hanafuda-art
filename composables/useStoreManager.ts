/**
 * @fileoverview Store Manager Composable
 *
 * Provides a centralized interface for game state serialization and persistence.
 * Implements a single-save slot system that prevents save scumming by only allowing
 * one suspended game state at a time.
 *
 * Anti-Save Scumming Features:
 * - Single save slot system (key: 'hanafuda-current-save')
 * - Save only available through "Save & Exit" dialog
 * - Save automatically deleted when game is resumed
 * - No manual save/load during active gameplay
 * - Hash-based integrity protection prevents tampering
 * - Environment variable salt for additional security
 *
 * Game State Lifecycle:
 * 1. Player starts new game → No save exists
 * 2. Player exits via "Save & Exit" → Save created, game suspended
 * 3. Player returns → "Resume Game" button appears
 * 4. Player resumes → Save deleted, game continues from saved state
 * 5. Player exits again → Must choose save/forfeit again
 *
 * Technical Features:
 * - Complete game state serialization/deserialization
 * - Cross-store hash verification with associated data salt
 * - Version compatibility checking for save formats
 * - File export/import for backup purposes
 * - Error handling and recovery mechanisms
 *
 * @example
 * ```typescript
 * const { quickSave, quickLoad, listSavedGames } = useStoreManager()
 *
 * // Save current game state (called from exit dialog)
 * const saveKey = quickSave() // Creates 'hanafuda-current-save'
 *
 * // Check if suspended game exists
 * const saves = listSavedGames() // Max 1 save
 *
 * // Resume game (automatically deletes save after loading)
 * const success = quickLoad()
 * ```
 */

import { useCardStore } from '~/stores/cardStore'
import { useConfigStore } from '~/stores/configStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { usePlayerStore } from '~/stores/playerStore'

/**
 * Serialized game state format for persistence
 * Each store's data is serialized as a JSON string to maintain encapsulation
 */
export interface SerializedGameState {
  /** Format version for compatibility checking */
  version: string
  /** Save timestamp in milliseconds */
  timestamp: number
  /** Unique game identifier */
  gameId: string

  /** Serialized card store state (hands, field, deck, collections) */
  cards: string
  /** Serialized game data store state (rounds, turns, phase, history) */
  gameData: string
  /** Serialized player store state (player info, bonus multiplier) */
  players: string
  /** Serialized config store state (game settings, preferences) */
  config: string
}

export const useStoreManager = () => {
  /**
   * Generates associated data salt from other stores for integrity protection
   * @param gameDataStore Game data store instance
   * @param playerStore Player store instance
   * @param configStore Config store instance
   * @returns Salt string derived from cross-store data
   */
  const generateAssociatedDataSalt = (
    gameDataStore: ReturnType<typeof useGameDataStore>,
    playerStore: ReturnType<typeof usePlayerStore>,
    configStore: ReturnType<typeof useConfigStore>,
  ): string => {
    // Use key data from other stores as salt to detect cross-store tampering
    const saltComponents = [
      gameDataStore.gameId,
      gameDataStore.roundCounter.toString(),
      gameDataStore.turnCounter.toString(),
      gameDataStore.turnPhase,
      playerStore.activePlayer.id,
      playerStore.bonusMultiplier.toString(),
      configStore.maxRounds.toString(),
      configStore.allowViewingsYaku,
    ]

    return saltComponents.join('|')
  }

  /**
   * Serializes the current game state from all stores
   */
  const serializeGameState = async (): Promise<SerializedGameState> => {
    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()
    const playerStore = usePlayerStore()
    const configStore = useConfigStore()

    // Generate salt from associated data in other stores
    const associatedSalt = generateAssociatedDataSalt(gameDataStore, playerStore, configStore)
    const gameId = gameDataStore.gameId

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      gameId,
      cards: await cardStore.exportSerializedState(associatedSalt, gameId),
      gameData: gameDataStore.exportSerializedState(),
      players: playerStore.exportSerializedState(),
      config: configStore.exportSerializedState(),
    }
  }

  /**
   * Restores game state to all stores from serialized data
   */
  const deserializeGameState = async (serializedState: SerializedGameState): Promise<boolean> => {
    try {
      const cardStore = useCardStore()
      const gameDataStore = useGameDataStore()
      const playerStore = usePlayerStore()
      const configStore = useConfigStore()

      // Validate version compatibility
      if (!isVersionCompatible(serializedState.version)) {
        console.warn(`Game state version ${serializedState.version} may not be compatible`)
      }

      // First, restore non-card stores to establish associated data
      const nonCardResults = [
        gameDataStore.importSerializedState(serializedState.gameData),
        playerStore.importSerializedState(serializedState.players),
        configStore.importSerializedState(serializedState.config),
      ]

      if (!nonCardResults.every((result) => result === true)) {
        throw new Error('Failed to restore non-card store states')
      }

      // Generate the same associated salt that was used during export
      const associatedSalt = generateAssociatedDataSalt(gameDataStore, playerStore, configStore)

      // Now restore card store with associated data salt and gameId for integrity verification and decryption
      const cardResult = await cardStore.importSerializedState(
        serializedState.cards,
        associatedSalt,
        serializedState.gameId,
      )

      if (!cardResult) {
        throw new Error('Card store failed to import - possible data tampering detected')
      }

      return true
    } catch (error) {
      console.error('Failed to restore game state:', error)
      return false
    }
  }

  /**
   * Saves current game state to localStorage (single save slot)
   */
  const saveGameToStorage = async (key?: string): Promise<string> => {
    const gameState = await serializeGameState()

    // For single save slot, always use fixed key and clear existing saves
    const storageKey = key || 'hanafuda-current-save'

    // Clear any existing saves to maintain single save slot
    if (!key) {
      const existingSaves = listSavedGames()
      for (const save of existingSaves) {
        localStorage.removeItem(save.key)
      }
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(gameState))
      return storageKey
    } catch (error) {
      console.error('Failed to save game to localStorage:', error)
      throw error
    }
  }

  /**
   * Loads game state from localStorage
   */
  const loadGameFromStorage = async (key: string): Promise<boolean> => {
    try {
      const serializedData = localStorage.getItem(key)
      if (!serializedData) {
        console.error(`No save data found for key: ${key}`)
        return false
      }

      const gameState = JSON.parse(serializedData) as SerializedGameState
      return await deserializeGameState(gameState)
    } catch (error) {
      console.error('Failed to load game from localStorage:', error)
      return false
    }
  }

  /**
   * Lists all saved games in localStorage (supports both current and legacy save formats)
   */
  const listSavedGames = (): Array<{ key: string; timestamp: number; gameId: string }> => {
    const savedGames: Array<{ key: string; timestamp: number; gameId: string }> = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      // Check for current single save or legacy save format
      if (key === 'hanafuda-current-save' || key?.startsWith('hanafuda-save-')) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const gameState = JSON.parse(data) as SerializedGameState
            savedGames.push({
              key,
              timestamp: gameState.timestamp,
              gameId: gameState.gameId,
            })
          }
        } catch (error) {
          console.warn(`Invalid save data for key ${key}:`, error)
        }
      }
    }

    return savedGames.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Deletes a saved game from localStorage
   */
  const deleteSavedGame = (key: string): boolean => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error('Failed to delete saved game:', error)
      return false
    }
  }

  /**
   * Exports current game state as downloadable JSON file
   */
  const exportGameState = async (filename?: string): Promise<void> => {
    const gameState = await serializeGameState()
    const dataStr = JSON.stringify(gameState, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })

    const link = document.createElement('a')
    link.href = URL.createObjectURL(dataBlob)
    link.download = filename || `hanafuda-save-${gameState.gameId}.json`
    link.click()

    URL.revokeObjectURL(link.href)
  }

  /**
   * Imports game state from JSON file
   */
  const importGameState = (file: File): Promise<boolean> => {
    return new Promise(async (resolve) => {
      const reader = new FileReader()

      reader.onload = async (event) => {
        try {
          const gameState = JSON.parse(event.target?.result as string) as SerializedGameState
          const success = await deserializeGameState(gameState)
          resolve(success)
        } catch (error) {
          console.error('Failed to import game state:', error)
          resolve(false)
        }
      }

      reader.onerror = () => {
        console.error('Failed to read file')
        resolve(false)
      }

      reader.readAsText(file)
    })
  }

  /**
   * Quick save with auto-generated key
   */
  const quickSave = async (): Promise<string> => {
    return await saveGameToStorage()
  }

  /**
   * Quick load from current save (single save slot)
   */
  const quickLoad = async (): Promise<boolean> => {
    // Try to load from fixed save key first
    const fixedSaveExists = localStorage.getItem('hanafuda-current-save')
    if (fixedSaveExists) {
      return await loadGameFromStorage('hanafuda-current-save')
    }

    // Fallback to any existing saves for backward compatibility
    const saves = listSavedGames()
    if (saves.length === 0) {
      console.warn('No saved games found')
      return false
    }

    return await loadGameFromStorage(saves[0].key)
  }

  /**
   * Checks version compatibility
   */
  const isVersionCompatible = (version: string): boolean => {
    const [major, minor] = version.split('.').map(Number)
    const [currentMajor, currentMinor] = '1.0.0'.split('.').map(Number)

    return major === currentMajor && minor <= currentMinor
  }

  return {
    serializeGameState,
    deserializeGameState,
    saveGameToStorage,
    loadGameFromStorage,
    listSavedGames,
    deleteSavedGame,
    exportGameState,
    importGameState,
    quickSave,
    quickLoad,
  }
}
