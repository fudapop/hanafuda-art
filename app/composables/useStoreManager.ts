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

import { getDexBeeDb } from '~/composables/useDexBee'
import { useCardStore } from '~~/stores/cardStore'
import { useConfigStore } from '~~/stores/configStore'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { usePlayerStore } from '~~/stores/playerStore'
import type {
  GameMode,
  GameSaveRecord,
  LocalGameSaveStore,
  MultiplayerGame,
  SyncStatus,
} from '~~/types/profile'
import {
  useGameSavesSyncAdapter,
  type GameSavesSyncAdapter,
} from './adapters/useGameSavesSyncAdapter'
import {
  useMultiplayerSyncAdapter,
  type MultiplayerSyncAdapter,
} from './adapters/useMultiplayerSyncAdapter'

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

// In-memory fallback store for tests / environments without IndexedDB
const memoryGameSaveStores = {
  byId: new Map<string, GameSaveRecord>(),
}

const createMemoryGameSaveStore = (): LocalGameSaveStore => {
  return {
    async init() {},
    async get(uid: string, saveKey: string) {
      const id = `${uid}_${saveKey}`
      return memoryGameSaveStores.byId.get(id) ?? null
    },
    async list(uid: string) {
      return Array.from(memoryGameSaveStores.byId.values()).filter((save) => save.uid === uid)
    },
    async set(save: GameSaveRecord) {
      memoryGameSaveStores.byId.set(save.id, save)
    },
    async remove(uid: string, saveKey: string) {
      const id = `${uid}_${saveKey}`
      memoryGameSaveStores.byId.delete(id)
    },
    async clear(uid: string) {
      const keysToDelete: string[] = []
      memoryGameSaveStores.byId.forEach((save, id) => {
        if (save.uid === uid) {
          keysToDelete.push(id)
        }
      })
      keysToDelete.forEach((key) => memoryGameSaveStores.byId.delete(key))
    },
  }
}

// Lazy factory for dexbee-js backed game saves store with graceful fallback
let gameSaveStoreInstance: LocalGameSaveStore | null = null

async function getGameSaveStore(): Promise<LocalGameSaveStore> {
  if (gameSaveStoreInstance) return gameSaveStoreInstance
  try {
    const { eq } = await import('dexbee-js')
    const db = await getDexBeeDb()
    const table = db.table('gameSaves')
    gameSaveStoreInstance = {
      async init() {
        // noop, table creation above is sufficient
      },
      async get(uid: string, saveKey: string) {
        const id = `${uid}_${saveKey}`
        const result = await table.where(eq('id', id)).first()
        return result as GameSaveRecord | null
      },
      async list(uid: string) {
        const results = await table.where(eq('uid', uid)).all()
        return (results || []) as GameSaveRecord[]
      },
      async set(save: GameSaveRecord) {
        const existing = await table.where(eq('id', save.id)).first()
        if (existing) {
          await table.update(save.id, save)
        } else {
          await table.insert(save)
        }
      },
      async remove(uid: string, saveKey: string) {
        const id = `${uid}_${saveKey}`
        await table.delete(id)
      },
      async clear(uid: string) {
        const saves = await table.where(eq('uid', uid)).all()
        for (const save of saves || []) {
          await table.delete(save.id)
        }
      },
    }
  } catch (error) {
    console.error(
      'Failed to initialize DexBee for game saves, falling back to memory store:',
      error,
    )
    gameSaveStoreInstance = createMemoryGameSaveStore()
  }
  await gameSaveStoreInstance.init()
  return gameSaveStoreInstance
}

/**
 * Get current user ID from profile, or 'guest_profile' for guests
 * Uses useState to access profile without circular dependency
 */
const getCurrentUserId = (): string => {
  if (import.meta.client) {
    try {
      // Access profile state directly via useState (same key as useProfile)
      const profile = useState<{ uid: string } | null>('profile', () => null)
      return profile.value?.uid || 'guest_profile'
    } catch {
      return 'guest_profile'
    }
  }
  return 'guest_profile'
}

/**
 * Migrate localStorage saves to IndexedDB
 */
const migrateLocalStorageSaves = async (): Promise<void> => {
  // Check for migration flag
  if (typeof window === 'undefined') return
  if (localStorage.getItem('hanafuda-saves-migrated')) return

  try {
    const store = await getGameSaveStore()
    const uid = 'guest_profile' // All localStorage saves are guest saves

    // Find all localStorage saves
    const savesToMigrate: Array<{ key: string; data: SerializedGameState }> = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key === 'hanafuda-current-save' || key?.startsWith('hanafuda-save-')) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const gameState = JSON.parse(data) as SerializedGameState
            savesToMigrate.push({ key, data: gameState })
          }
        } catch (error) {
          console.warn(`Invalid save data for key ${key} during migration:`, error)
        }
      }
    }

    // Migrate to IndexedDB with NEW key format
    for (const { key, data } of savesToMigrate) {
      // Use new fixed key format instead of old key
      const newKey = 'hanafuda-save-single'

      const saveRecord: GameSaveRecord = {
        id: `${uid}_${newKey}`,
        uid,
        saveKey: newKey, // Use new key format
        gameState: data,
        timestamp: new Date(data.timestamp),
        gameId: data.gameId,
        mode: 'single', // Legacy saves default to single-player
        p1: null,
        p2: null,
        activePlayer: null,
      }
      await store.set(saveRecord)
      console.info(`Migrated save from '${key}' to '${newKey}'`)
    }

    // Set migration flag
    localStorage.setItem('hanafuda-saves-migrated', 'true')
    console.info(`Migrated ${savesToMigrate.length} saves from localStorage to IndexedDB`)
  } catch (error) {
    console.error('Failed to migrate localStorage saves:', error)
  }
}

/**
 * Migrate old IndexedDB save keys to new fixed key format
 * This runs per-user using a flag based on their UID
 */
const migrateIndexedDBSaveKeys = async (uid: string): Promise<void> => {
  if (typeof window === 'undefined') return

  // Use per-user migration flag
  const migrationFlag = `hanafuda-keys-migrated-v2-${uid}`
  if (localStorage.getItem(migrationFlag)) return

  try {
    const store = await getGameSaveStore()

    // Get all saves for this specific user
    const saves = await store.list(uid)

    if (saves.length === 0) {
      // No saves to migrate, set flag and return
      localStorage.setItem(migrationFlag, 'true')
      return
    }

    console.info(`Starting save key migration for user ${uid}, found ${saves.length} saves`)

    // Separate saves into those needing migration and those already migrated
    const savesToMigrate: GameSaveRecord[] = []
    const alreadyMigrated: GameSaveRecord[] = []

    for (const save of saves) {
      if (save.saveKey === 'hanafuda-save-single' || save.saveKey === 'hanafuda-save-multiplayer') {
        alreadyMigrated.push(save)
      } else {
        savesToMigrate.push(save)
      }
    }

    if (alreadyMigrated.length > 0) {
      console.info(
        `Found ${alreadyMigrated.length} saves already using new format, skipping migration for these`,
      )
    }

    if (savesToMigrate.length === 0) {
      // No saves to migrate, set flag and return
      localStorage.setItem(migrationFlag, 'true')
      console.info(`No saves need migration for user ${uid}`)
      return
    }

    console.info(`Found ${savesToMigrate.length} saves that need migration`)

    // Group saves by resolved mode
    const savesByMode = new Map<'single' | 'multiplayer', GameSaveRecord[]>()

    for (const save of savesToMigrate) {
      // Determine mode (default to single if mode is missing)
      const mode = (save.mode || 'single') as 'single' | 'multiplayer'
      if (!savesByMode.has(mode)) {
        savesByMode.set(mode, [])
      }
      savesByMode.get(mode)!.push(save)
    }

    let migratedCount = 0
    let skippedCount = 0

    // Process each mode group
    for (const [mode, modeSaves] of savesByMode.entries()) {
      const newKey = mode === 'multiplayer' ? 'hanafuda-save-multiplayer' : 'hanafuda-save-single'

      console.info(
        `Processing ${modeSaves.length} saves for mode '${mode}' (target key: '${newKey}')`,
      )

      // Find the most recent save by timestamp
      const mostRecentSave = modeSaves.reduce((latest, current) => {
        const latestTime = latest.timestamp instanceof Date ? latest.timestamp.getTime() : 0
        const currentTime = current.timestamp instanceof Date ? current.timestamp.getTime() : 0
        return currentTime > latestTime ? current : latest
      })

      const mostRecentTime =
        mostRecentSave.timestamp instanceof Date ? mostRecentSave.timestamp.getTime() : 0

      console.info(
        `Selected most recent save for mode '${mode}': key '${mostRecentSave.saveKey}', timestamp: ${new Date(mostRecentTime).toISOString()}`,
      )

      // Migrate the most recent save
      const updatedSave: GameSaveRecord = {
        ...mostRecentSave,
        id: `${uid}_${newKey}`,
        saveKey: newKey,
        mode: mode as 'single' | 'multiplayer', // Ensure mode is set
      }

      await store.set(updatedSave)
      console.info(
        `✓ Migrated save key from '${mostRecentSave.saveKey}' to '${newKey}' (id: ${updatedSave.id})`,
      )
      migratedCount++

      // Remove the migrated save's old key
      await store.remove(uid, mostRecentSave.saveKey)

      // Skip and remove older saves in the same mode group
      for (const save of modeSaves) {
        if (save.id === mostRecentSave.id) continue // Already migrated

        const saveTime = save.timestamp instanceof Date ? save.timestamp.getTime() : 0
        console.info(
          `⊘ Skipping older save: key '${save.saveKey}', timestamp: ${new Date(saveTime).toISOString()} (mode: '${mode}')`,
        )

        // Remove the old save to prevent conflicts
        await store.remove(uid, save.saveKey)
        skippedCount++
      }
    }

    // Set migration flag for this user
    localStorage.setItem(migrationFlag, 'true')
    console.info(
      `IndexedDB save keys migration complete for ${uid}: ${migratedCount} saves migrated, ${skippedCount} older saves skipped and removed`,
    )
  } catch (error) {
    console.error(`Failed to migrate IndexedDB save keys for ${uid}:`, error)
  }
}

export const useStoreManager = () => {
  // Initialize localStorage migration on first use (runs once globally)
  if (import.meta.client) {
    void migrateLocalStorageSaves()
  }

  // Sync state management
  const syncAdapter = useState<GameSavesSyncAdapter | null>('game-saves-sync-adapter', () => null)
  const multiplayerAdapter = useState<MultiplayerSyncAdapter | null>(
    'multiplayer-sync-adapter',
    () => null,
  )
  const syncStatus = useState<SyncStatus>('game-saves-sync-status', () => 'idle')
  const syncTimeoutId = useState<ReturnType<typeof setTimeout> | null>(
    'game-saves-sync-timeout-id',
    () => null,
  )

  /**
   * Get fixed save key for a given mode
   */
  const getSaveKeyForMode = (mode: GameMode): string => {
    return mode === 'multiplayer' ? 'hanafuda-save-multiplayer' : 'hanafuda-save-single'
  }

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
   * Saves current game state to IndexedDB
   * Uses fixed save keys based on mode: 'hanafuda-save-single' or 'hanafuda-save-multiplayer'
   * For guests: only single-player mode is allowed
   */
  const saveGameToStorage = async (
    mode: GameMode = 'single',
    p1?: string | null,
    p2?: string | null,
    activePlayer?: string | null,
  ): Promise<string> => {
    const gameState = await serializeGameState()
    const uid = getCurrentUserId()
    const isGuest = uid === 'guest_profile'
    const store = await getGameSaveStore()

    // Guests cannot save multiplayer games
    if (isGuest && mode === 'multiplayer') {
      throw new Error('Multiplayer saves are not available for guest accounts')
    }

    // Use fixed save key based on mode
    const storageKey = getSaveKeyForMode(mode)

    try {
      const saveRecord: GameSaveRecord = {
        id: `${uid}_${storageKey}`,
        uid,
        saveKey: storageKey,
        gameState,
        timestamp: new Date(gameState.timestamp),
        gameId: gameState.gameId,
        mode,
        p1: p1 || null,
        p2: p2 || null,
        activePlayer: activePlayer || null,
      }
      await store.set(saveRecord)

      // Trigger auto-sync for authenticated users (single-player saves only)
      // Multiplayer saves sync to shared collection separately
      if (!isGuest && mode === 'single') {
        triggerAutoSync(uid)
      }

      return storageKey
    } catch (error) {
      console.error('Failed to save game to IndexedDB:', error)
      throw error
    }
  }

  /**
   * Loads game state from IndexedDB
   */
  const loadGameFromStorage = async (key: string): Promise<boolean> => {
    try {
      const uid = getCurrentUserId()
      const store = await getGameSaveStore()
      const saveRecord = await store.get(uid, key)

      if (!saveRecord) {
        console.error(`No save data found for key: ${key}`)
        return false
      }

      const gameState = saveRecord.gameState as SerializedGameState
      return await deserializeGameState(gameState)
    } catch (error) {
      console.error('Failed to load game from IndexedDB:', error)
      return false
    }
  }

  /**
   * Lists all saved games for current user from IndexedDB
   * Triggers migration on first call per user
   */
  const listSavedGames = async (): Promise<
    Array<{
      key: string
      timestamp: number
      gameId: string
      mode: GameMode
      p1?: string | null
      p2?: string | null
      activePlayer?: string | null
    }>
  > => {
    try {
      const uid = getCurrentUserId()

      // Run migration for this user (only runs once per user)
      await migrateIndexedDBSaveKeys(uid)

      const store = await getGameSaveStore()
      const saves = await store.list(uid)

      return saves
        .map((save: GameSaveRecord) => ({
          key: save.saveKey,
          timestamp: save.timestamp.getTime(),
          gameId: save.gameId,
          mode: save.mode,
          p1: save.p1,
          p2: save.p2,
          activePlayer: save.activePlayer,
        }))
        .sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('Failed to list saved games:', error)
      return []
    }
  }

  /**
   * Deletes a saved game from IndexedDB
   */
  const deleteSavedGame = async (key: string): Promise<boolean> => {
    try {
      const uid = getCurrentUserId()
      const isGuest = uid === 'guest_profile'
      const store = await getGameSaveStore()
      await store.remove(uid, key)

      // Trigger auto-sync for authenticated users
      if (!isGuest && syncAdapter.value) {
        await syncAdapter.value.remove(uid, key)
      }

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
   * Quick load from current save (single save slot for guests, most recent for authenticated)
   */
  const quickLoad = async (): Promise<boolean> => {
    const uid = getCurrentUserId()

    // Run migration first to ensure old saves are converted
    await migrateIndexedDBSaveKeys(uid)

    // Get most recent save (migration ensures new key format)
    const saves = await listSavedGames()
    if (saves.length === 0) {
      console.warn('No saved games found')
      return false
    }

    return await loadGameFromStorage(saves[0]?.key || '')
  }

  /**
   * Checks version compatibility
   */
  const isVersionCompatible = (version: string): boolean => {
    const [major, minor] = version.split('.').map(Number)
    const [currentMajor, currentMinor] = '1.0.0'.split('.').map(Number)

    return major === currentMajor && (minor ?? 0) <= (currentMinor ?? 0)
  }

  /**
   * Initialize sync adapters (called when user authenticates)
   */
  const initializeSync = () => {
    if (!syncAdapter.value) {
      syncAdapter.value = useGameSavesSyncAdapter()
      console.info('Game saves sync adapter initialized')
    }
    if (!multiplayerAdapter.value) {
      multiplayerAdapter.value = useMultiplayerSyncAdapter()
      console.info('Multiplayer sync adapter initialized')
    }
  }

  /**
   * Push all local saves to Firestore
   * @param uid - User ID to push saves for
   * @param transferFromGuest - If true, transfer saves from 'guest_profile' to uid
   */
  const syncPush = async (uid: string, transferFromGuest = false): Promise<void> => {
    if (!syncAdapter.value) {
      console.warn('Sync adapter not initialized')
      return
    }

    if (syncStatus.value === 'pushing') {
      console.warn('Sync push already in progress')
      return
    }

    syncStatus.value = 'pushing'

    try {
      if (!(await syncAdapter.value.isAvailable())) {
        console.warn('Firestore not available for sync')
        syncStatus.value = 'idle'
        return
      }

      const store = await getGameSaveStore()
      let localSaves = await store.list(uid)

      // If transferring from guest, get guest saves and update their uid
      if (transferFromGuest) {
        const guestSaves = await store.list('guest_profile')
        for (const guestSave of guestSaves) {
          // Update save to authenticated account
          const updatedSave: GameSaveRecord = {
            ...guestSave,
            id: `${uid}_${guestSave.saveKey}`,
            uid,
          }
          // Save to authenticated account
          await store.set(updatedSave)
          // Remove from guest account
          await store.remove('guest_profile', guestSave.saveKey)
          // Push to remote
          await syncAdapter.value.push(updatedSave)
        }
        // Refresh list after transfer
        localSaves = await store.list(uid)
      } else {
        // Push all local saves to remote
        for (const save of localSaves) {
          await syncAdapter.value.push(save)
        }
      }

      console.info(`Pushed ${localSaves.length} saves to Firestore`)
      syncStatus.value = 'idle'
    } catch (error) {
      console.error('Sync push error:', error)
      syncStatus.value = 'error'
    }
  }

  /**
   * Pull remote saves and merge with local (latest timestamp wins)
   */
  const syncPull = async (uid: string): Promise<void> => {
    if (!syncAdapter.value) {
      console.warn('Sync adapter not initialized')
      return
    }

    if (syncStatus.value === 'pulling') {
      console.warn('Sync pull already in progress')
      return
    }

    syncStatus.value = 'pulling'

    try {
      if (!(await syncAdapter.value.isAvailable())) {
        console.warn('Firestore not available for sync')
        syncStatus.value = 'idle'
        return
      }

      const store = await getGameSaveStore()
      const remoteSaves = await syncAdapter.value.pull(uid)
      const localSaves = await store.list(uid)

      // Merge strategy: latest timestamp wins
      const localMap = new Map<string, GameSaveRecord>()
      localSaves.forEach((save) => {
        localMap.set(save.saveKey, save)
      })

      let mergedCount = 0
      for (const remoteSave of remoteSaves) {
        const localSave = localMap.get(remoteSave.saveKey)

        if (!localSave) {
          // New remote save - add it
          await store.set(remoteSave)
          mergedCount++
        } else {
          // Conflict: keep the one with newer timestamp
          const remoteTime = remoteSave.timestamp.getTime()
          const localTime = localSave.timestamp.getTime()

          if (remoteTime > localTime) {
            // Remote is newer - replace local
            await store.set(remoteSave)
            mergedCount++
          }
          // Otherwise keep local (already in IndexedDB)
        }
      }

      console.info(`Pulled ${remoteSaves.length} saves, merged ${mergedCount} new/updated saves`)
      syncStatus.value = 'idle'
    } catch (error) {
      console.error('Sync pull error:', error)
      syncStatus.value = 'error'
    }
  }

  /**
   * Debounced auto-sync trigger
   */
  const triggerAutoSync = (uid: string) => {
    if (!syncAdapter.value) return

    // Clear existing timeout
    if (syncTimeoutId.value) {
      clearTimeout(syncTimeoutId.value)
    }

    // Set new timeout (1 second debounce)
    syncTimeoutId.value = setTimeout(() => {
      if (syncStatus.value === 'idle') {
        void syncPush(uid)
      }
    }, 1000)
  }

  /**
   * Save a multiplayer game (both local and shared Firestore)
   * @param p1 - Player 1 uid
   * @param p2 - Player 2 uid
   * @param activePlayer - Current turn player uid
   */
  const saveMultiplayerGame = async (
    p1: string,
    p2: string,
    activePlayer: string,
  ): Promise<string> => {
    const uid = getCurrentUserId()

    // Validate caller is the active player
    if (uid !== activePlayer) {
      throw new Error('Only the active player can save a multiplayer game')
    }

    // Validate caller is a participant
    if (uid !== p1 && uid !== p2) {
      throw new Error('Only participants can save a multiplayer game')
    }

    // Save to local IndexedDB
    const saveKey = await saveGameToStorage('multiplayer', p1, p2, activePlayer)

    // Also push to shared Firestore collection if adapter initialized
    if (multiplayerAdapter.value) {
      try {
        if (await multiplayerAdapter.value.isAvailable()) {
          const gameState = await serializeGameState()
          const multiplayerGame: MultiplayerGame = {
            gameId: gameState.gameId,
            gameState,
            mode: 'multiplayer',
            p1,
            p2,
            activePlayer,
            lastUpdated: new Date(),
            createdAt: new Date(), // Will be overwritten if game already exists
          }
          await multiplayerAdapter.value.push(multiplayerGame, uid)
          console.info('Multiplayer game saved to shared Firestore')
        }
      } catch (error) {
        console.error('Failed to push multiplayer game to Firestore:', error)
        // Don't throw - local save succeeded
      }
    }

    return saveKey
  }

  /**
   * Load a multiplayer game from local IndexedDB
   * Does not auto-delete (multiplayer saves persist)
   */
  const loadMultiplayerGame = async (): Promise<boolean> => {
    const saveKey = getSaveKeyForMode('multiplayer')
    return await loadGameFromStorage(saveKey)
  }

  /**
   * Pull the latest multiplayer game from shared Firestore
   * Updates local cache if remote is newer
   */
  const syncMultiplayerGame = async (gameId: string): Promise<boolean> => {
    if (!multiplayerAdapter.value) {
      console.warn('Multiplayer adapter not initialized')
      return false
    }

    try {
      const remoteGame = await multiplayerAdapter.value.get(gameId)
      if (!remoteGame) {
        console.warn(`Multiplayer game ${gameId} not found in Firestore`)
        return false
      }

      // Check if local cache is outdated
      const uid = getCurrentUserId()
      const store = await getGameSaveStore()
      const localSave = await store.get(uid, getSaveKeyForMode('multiplayer'))

      if (!localSave || remoteGame.lastUpdated > localSave.timestamp) {
        // Update local cache with remote state
        const updatedSave: GameSaveRecord = {
          id: `${uid}_${getSaveKeyForMode('multiplayer')}`,
          uid,
          saveKey: getSaveKeyForMode('multiplayer'),
          gameState: remoteGame.gameState,
          timestamp: remoteGame.lastUpdated,
          gameId: remoteGame.gameId,
          mode: 'multiplayer',
          p1: remoteGame.p1,
          p2: remoteGame.p2,
          activePlayer: remoteGame.activePlayer,
        }
        await store.set(updatedSave)
        console.info('Multiplayer game synced from Firestore')
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to sync multiplayer game:', error)
      return false
    }
  }

  /**
   * List all multiplayer games for current user from Firestore
   */
  const listMultiplayerGames = async (): Promise<MultiplayerGame[]> => {
    if (!multiplayerAdapter.value) {
      console.warn('Multiplayer adapter not initialized')
      return []
    }

    try {
      const uid = getCurrentUserId()
      return await multiplayerAdapter.value.list(uid)
    } catch (error) {
      console.error('Failed to list multiplayer games:', error)
      return []
    }
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
    initializeSync,
    syncPush,
    syncPull,
    syncStatus: computed(() => syncStatus.value),
    // Multiplayer functions
    saveMultiplayerGame,
    loadMultiplayerGame,
    syncMultiplayerGame,
    listMultiplayerGames,
    getSaveKeyForMode,
  }
}
