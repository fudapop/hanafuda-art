import { type Ref, toRaw } from 'vue'
import { useCardStore, type CardStoreState } from '~/stores/cardStore'
import { usePlayerStore } from '~/stores/playerStore'
import { useGameDataStore, type RoundResult } from '~/stores/gameDataStore'
import { useConfigStore, type GameSettings } from '~/stores/configStore'

interface GameSaveData {
  id: string
  timestamp: number
  version: string
  gameState: {
    cards: CardStoreState
    players: ReturnType<typeof usePlayerStore>['$state']
    gameData: {
      gameId: string
      roundHistory: RoundResult[]
      roundCounter: number
      turnCounter: number
      turnPhase: string
      roundOver: boolean
      gameOver: boolean
    }
    config: GameSettings
  }
  metadata: {
    gameType: 'hanafuda'
    platform: 'web'
    userAgent: string
  }
}

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

const DB_NAME = 'HanafudaGameDB'
const DB_VERSION = 1
const SAVE_STORE = 'gameSaves'
const PROFILE_STORE = 'profile'
const SETTINGS_STORE = 'settings'

export const useGamePersistence = () => {
  const isSupported = ref(typeof window !== 'undefined' && 'indexedDB' in window)
  const isInitialized = ref(false)
  const error = ref<Error | null>(null)
  
  let db: IDBDatabase | null = null

  // Initialize IndexedDB
  const initDB = async (): Promise<IDBDatabase> => {
    if (db && isInitialized.value) return db

    return new Promise((resolve, reject) => {
      if (!isSupported.value) {
        reject(new Error('IndexedDB is not supported in this browser'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        const err = new Error(`Failed to open database: ${request.error?.message}`)
        error.value = err
        reject(err)
      }

      request.onsuccess = () => {
        db = request.result
        isInitialized.value = true
        error.value = null
        resolve(db)
      }

      request.onupgradeneeded = () => {
        const database = request.result

        // Game saves store
        if (!database.objectStoreNames.contains(SAVE_STORE)) {
          const saveStore = database.createObjectStore(SAVE_STORE, { keyPath: 'id' })
          saveStore.createIndex('timestamp', 'timestamp', { unique: false })
          saveStore.createIndex('name', 'name', { unique: false })
        }

        // Profile store for offline play
        if (!database.objectStoreNames.contains(PROFILE_STORE)) {
          const profileStore = database.createObjectStore(PROFILE_STORE, { keyPath: 'id' })
          profileStore.createIndex('lastUpdated', 'lastUpdated', { unique: false })
        }

        // Settings store
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE, { keyPath: 'key' })
        }
      }
    })
  }

  // Save current game state
  const saveGame = async (slotName: string = 'auto-save'): Promise<string> => {
    try {
      const database = await initDB()
      const cardStore = useCardStore()
      const playerStore = usePlayerStore()
      const gameDataStore = useGameDataStore()
      const configStore = useConfigStore()

      const saveId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Convert Sets to Arrays for JSON serialization
      const cardState: CardStoreState = {
        hand: {
          p1: new Set([...cardStore.hand.p1]),
          p2: new Set([...cardStore.hand.p2])
        },
        collection: {
          p1: new Set([...cardStore.collection.p1]),
          p2: new Set([...cardStore.collection.p2])
        },
        field: new Set([...cardStore.field]),
        deck: new Set([...cardStore.deck]),
        staged: new Set([...cardStore.staged])
      }

      const saveData: GameSaveData = {
        id: saveId,
        timestamp: Date.now(),
        version: '2.1.0', // From package.json
        gameState: {
          cards: {
            hand: {
              p1: new Set(Array.from(cardStore.hand.p1)),
              p2: new Set(Array.from(cardStore.hand.p2))
            },
            collection: {
              p1: new Set(Array.from(cardStore.collection.p1)),
              p2: new Set(Array.from(cardStore.collection.p2))
            },
            field: new Set(Array.from(cardStore.field)),
            deck: new Set(Array.from(cardStore.deck)),
            staged: new Set(Array.from(cardStore.staged))
          },
          players: JSON.parse(JSON.stringify(playerStore.$state)),
          gameData: {
            gameId: toRaw(gameDataStore.gameId),
            roundHistory: [...toRaw(gameDataStore.roundHistory)],
            roundCounter: toRaw(gameDataStore.roundCounter),
            turnCounter: toRaw(gameDataStore.turnCounter),
            turnPhase: toRaw(gameDataStore.turnPhase),
            roundOver: toRaw(gameDataStore.roundOver),
            gameOver: toRaw(gameDataStore.gameOver)
          },
          config: JSON.parse(JSON.stringify(configStore.$state))
        },
        metadata: {
          gameType: 'hanafuda',
          platform: 'web',
          userAgent: navigator.userAgent
        }
      }

      // Serialize Sets to Arrays for storage
      const serializedSave = {
        ...saveData,
        gameState: {
          ...saveData.gameState,
          cards: {
            hand: {
              p1: Array.from(saveData.gameState.cards.hand.p1),
              p2: Array.from(saveData.gameState.cards.hand.p2)
            },
            collection: {
              p1: Array.from(saveData.gameState.cards.collection.p1),
              p2: Array.from(saveData.gameState.cards.collection.p2)
            },
            field: Array.from(saveData.gameState.cards.field),
            deck: Array.from(saveData.gameState.cards.deck),
            staged: Array.from(saveData.gameState.cards.staged)
          }
        }
      }

      const transaction = database.transaction([SAVE_STORE], 'readwrite')
      const store = transaction.objectStore(SAVE_STORE)

      // Create save slot entry
      const saveSlot: SaveSlot = {
        id: saveId,
        name: slotName,
        timestamp: Date.now(),
        preview: {
          round: toRaw(gameDataStore.roundCounter),
          turn: toRaw(gameDataStore.turnCounter),
          phase: toRaw(gameDataStore.turnPhase),
          score: toRaw(gameDataStore.scoreboard)
        }
      }

      // Store both the full save data and the save slot
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const saveRequest = store.put({ ...serializedSave, slot: saveSlot })
          saveRequest.onsuccess = () => resolve()
          saveRequest.onerror = () => reject(saveRequest.error)
        })
      ])

      return saveId
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // Load game state
  const loadGame = async (saveId: string): Promise<void> => {
    try {
      const database = await initDB()
      const transaction = database.transaction([SAVE_STORE], 'readonly')
      const store = transaction.objectStore(SAVE_STORE)

      const saveData = await new Promise<GameSaveData>((resolve, reject) => {
        const request = store.get(saveId)
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result)
          } else {
            reject(new Error(`Save not found: ${saveId}`))
          }
        }
        request.onerror = () => reject(request.error)
      })

      // Restore stores
      const cardStore = useCardStore()
      const playerStore = usePlayerStore()
      const gameDataStore = useGameDataStore()
      const configStore = useConfigStore()

      // Deserialize Arrays back to Sets for card store
      const cardState = {
        hand: {
          p1: new Set(saveData.gameState.cards.hand.p1 as string[]),
          p2: new Set(saveData.gameState.cards.hand.p2 as string[])
        },
        collection: {
          p1: new Set(saveData.gameState.cards.collection.p1 as string[]),
          p2: new Set(saveData.gameState.cards.collection.p2 as string[])
        },
        field: new Set(saveData.gameState.cards.field as string[]),
        deck: new Set(saveData.gameState.cards.deck as string[]),
        staged: new Set(saveData.gameState.cards.staged as string[])
      }

      // Reset and restore state
      cardStore.$patch(cardState)
      playerStore.$patch(saveData.gameState.players)
      configStore.$patch(saveData.gameState.config)
      
      // Restore game data store properties individually since it uses composition API
      gameDataStore.gameId = saveData.gameState.gameData.gameId
      gameDataStore.roundHistory.splice(0, gameDataStore.roundHistory.length, ...saveData.gameState.gameData.roundHistory)
      gameDataStore.roundCounter = saveData.gameState.gameData.roundCounter
      gameDataStore.turnCounter = saveData.gameState.gameData.turnCounter
      gameDataStore.turnPhase = saveData.gameState.gameData.turnPhase
      gameDataStore.roundOver = saveData.gameState.gameData.roundOver
      gameDataStore.gameOver = saveData.gameState.gameData.gameOver

      error.value = null
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // Get all saved games
  const getSavedGames = async (): Promise<SaveSlot[]> => {
    try {
      const database = await initDB()
      const transaction = database.transaction([SAVE_STORE], 'readonly')
      const store = transaction.objectStore(SAVE_STORE)
      const index = store.index('timestamp')

      return new Promise((resolve, reject) => {
        const request = index.getAll()
        request.onsuccess = () => {
          const saves = request.result
            .map((save: any) => save.slot)
            .filter(Boolean)
            .sort((a: SaveSlot, b: SaveSlot) => b.timestamp - a.timestamp)
          resolve(saves)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // Delete saved game
  const deleteSave = async (saveId: string): Promise<void> => {
    try {
      const database = await initDB()
      const transaction = database.transaction([SAVE_STORE], 'readwrite')
      const store = transaction.objectStore(SAVE_STORE)

      return new Promise<void>((resolve, reject) => {
        const request = store.delete(saveId)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // Auto-save functionality
  const autoSave = async (): Promise<string | null> => {
    try {
      const gameDataStore = useGameDataStore()
      
      // Only auto-save if game is in progress
      if (toRaw(gameDataStore.gameOver) || toRaw(gameDataStore.turnCounter) === 1) {
        return null
      }

      return await saveGame('Auto Save')
    } catch (err) {
      console.warn('Auto-save failed:', err)
      return null
    }
  }

  // Clear all saves (useful for testing)
  const clearAllSaves = async (): Promise<void> => {
    try {
      const database = await initDB()
      const transaction = database.transaction([SAVE_STORE], 'readwrite')
      const store = transaction.objectStore(SAVE_STORE)

      return new Promise<void>((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // Future: Save profile data for offline play
  const saveProfile = async (profileData: any): Promise<void> => {
    try {
      const database = await initDB()
      const transaction = database.transaction([PROFILE_STORE], 'readwrite')
      const store = transaction.objectStore(PROFILE_STORE)

      const profile = {
        id: 'local_profile',
        ...profileData,
        lastUpdated: Date.now(),
        needsSync: true // Flag for Firestore sync
      }

      return new Promise<void>((resolve, reject) => {
        const request = store.put(profile)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // Future: Load profile data for offline play
  const loadProfile = async (): Promise<any | null> => {
    try {
      const database = await initDB()
      const transaction = database.transaction([PROFILE_STORE], 'readonly')
      const store = transaction.objectStore(PROFILE_STORE)

      return new Promise<any>((resolve, reject) => {
        const request = store.get('local_profile')
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // Initialize on first use
  onMounted(() => {
    if (isSupported.value) {
      initDB().catch(console.error)
    }
  })

  return {
    // State
    isSupported: readonly(isSupported),
    isInitialized: readonly(isInitialized),
    error: readonly(error),

    // Methods
    initDB,
    saveGame,
    loadGame,
    getSavedGames,
    deleteSave,
    autoSave,
    clearAllSaves,
    
    // Future extensibility
    saveProfile,
    loadProfile
  }
}