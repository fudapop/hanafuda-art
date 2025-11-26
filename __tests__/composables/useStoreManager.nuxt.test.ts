import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { useCardStore } from '../../stores/cardStore'
import { useConfigStore } from '../../stores/configStore'
import { useGameDataStore } from '../../stores/gameDataStore'
import { usePlayerStore } from '../../stores/playerStore'

describe('useStoreManager', () => {
  // Store reference to fake IndexedDB to ensure we only clean up the fake one
  let fakeIndexedDB: IDBFactory

  // Helper function to get useStoreManager with fresh module cache
  const getStoreManager = async () => {
    const { useStoreManager } = await import('../../app/composables/useStoreManager')
    return useStoreManager()
  }

  beforeEach(async () => {
    setActivePinia(createPinia())

    // Always replace with fake IndexedDB for tests to ensure isolation
    // This prevents any risk of affecting the real database
    fakeIndexedDB = new IDBFactory()
    globalThis.indexedDB = fakeIndexedDB
    globalThis.IDBKeyRange = IDBKeyRange

    // Reset module-level caches to ensure fresh connections
    // This is necessary because getDexBeeDb() and getGameSaveStore() cache their instances
    // We need to clear these caches so they reconnect to the new fake IndexedDB
    vi.resetModules()
    // Re-import modules to get fresh instances with cleared caches
    // This ensures getDexBeeDb() will create a new connection to our fake IndexedDB
    await import('../../app/composables/useDexBee')
    await import('../../app/composables/useStoreManager')

    // Mock localStorage for Node.js environment (used by some tests and migration code)
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        key: vi.fn(),
        length: 0,
        clear: vi.fn(),
      },
      writable: true,
    })

    // Mock document for file download tests
    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: vi.fn(() => ({
          href: '',
          download: '',
          click: vi.fn(),
        })),
      },
      writable: true,
    })

    // Mock URL for blob handling
    Object.defineProperty(globalThis, 'URL', {
      value: {
        createObjectURL: vi.fn(() => 'mock-url'),
        revokeObjectURL: vi.fn(),
      },
      writable: true,
    })
  })

  afterEach(async () => {
    // Clean up saved game data first using the store manager API
    // This ensures both IndexedDB and in-memory fallback stores are cleared
    // This is safe because useStoreManager will use the fake IndexedDB we set up
    try {
      const { deleteSavedGame } = await getStoreManager()
      await deleteSavedGame('hanafuda-save-single').catch(() => {
        // Ignore if save doesn't exist
      })
      await deleteSavedGame('hanafuda-save-multiplayer').catch(() => {
        // Ignore if save doesn't exist
      })
    } catch (error) {
      // Ignore errors - cleanup is best effort
    }

    // Clean up IndexedDB database after each test to prevent test pollution
    // SAFETY: Only clean up the fake IndexedDB instance we created in beforeEach
    // This ensures we never touch the real database
    // Additional safety: verify we're in a test environment
    if (
      process.env.NODE_ENV === 'test' &&
      fakeIndexedDB &&
      globalThis.indexedDB === fakeIndexedDB
    ) {
      try {
        // Delete the database used by DexBee in the fake IndexedDB
        // This will force a fresh connection in the next test
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = fakeIndexedDB.deleteDatabase('newhanafuda')
          deleteRequest.onsuccess = () => resolve()
          deleteRequest.onerror = () => {
            // If database doesn't exist, that's fine - just resolve
            if (deleteRequest.error?.name === 'NotFoundError') {
              resolve()
            } else {
              reject(deleteRequest.error)
            }
          }
          deleteRequest.onblocked = () => {
            // If blocked, wait a bit and try again
            setTimeout(() => resolve(), 100)
          }
        })
      } catch (error) {
        // Ignore errors during cleanup - test isolation is best effort
      }
    }
  })

  it('should serialize game state correctly', async () => {
    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()

    const { serializeGameState } = await getStoreManager()

    // Set up some test data
    cardStore.dealCards()
    gameDataStore.startRound()

    const serialized = await serializeGameState()

    expect(serialized).toHaveProperty('version', '1.0.0')
    expect(serialized).toHaveProperty('timestamp')
    expect(serialized).toHaveProperty('gameId')
    expect(serialized).toHaveProperty('cards')
    expect(serialized).toHaveProperty('gameData')
    expect(serialized).toHaveProperty('players')
    expect(serialized).toHaveProperty('config')

    // Verify each store's data is serialized as JSON strings
    expect(typeof serialized.cards).toBe('string')
    expect(typeof serialized.gameData).toBe('string')
    expect(typeof serialized.players).toBe('string')
    expect(typeof serialized.config).toBe('string')

    // Verify the JSON strings can be parsed
    expect(() => JSON.parse(serialized.cards)).not.toThrow()
    expect(() => JSON.parse(serialized.gameData)).not.toThrow()
    expect(() => JSON.parse(serialized.players)).not.toThrow()
    expect(() => JSON.parse(serialized.config)).not.toThrow()

    // Verify cards data is encrypted (should have encryptedData property, not data)
    const cardsData = JSON.parse(serialized.cards)
    expect(cardsData).toHaveProperty('encryptedData')
    expect(cardsData).not.toHaveProperty('data')
  })

  it('should deserialize and restore game state correctly', async () => {
    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()

    const { serializeGameState, deserializeGameState } = await getStoreManager()

    // Set up initial state
    cardStore.dealCards()
    gameDataStore.startRound()
    gameDataStore.nextPhase() // Move to draw phase

    const originalGameId = gameDataStore.gameId
    const originalPhase = gameDataStore.turnPhase
    const originalP1Hand = Array.from(cardStore.hand.p1)

    // Serialize the state
    const serialized = await serializeGameState()

    // Reset stores to different state
    cardStore.reset()
    gameDataStore.reset()

    // Verify state was reset
    expect(cardStore.hand.p1.size).toBe(0)
    expect(gameDataStore.turnPhase).toBe('select')

    // Restore from serialized state
    const success = await deserializeGameState(serialized)

    expect(success).toBe(true)
    expect(gameDataStore.gameId).toBe(originalGameId)
    expect(gameDataStore.turnPhase).toBe(originalPhase)
    expect(Array.from(cardStore.hand.p1)).toEqual(originalP1Hand)
  })

  it('should handle persistent save and load via IndexedDB-backed storage', async () => {
    const { saveGameToStorage, loadGameFromStorage, deleteSavedGame } = await getStoreManager()

    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()

    try {
      // Set up some deterministic state
      cardStore.dealCards()
      gameDataStore.startRound()
      const originalGameId = gameDataStore.gameId
      const originalPhase = gameDataStore.turnPhase
      const originalP1Hand = Array.from(cardStore.hand.p1)

      // Save to persistent storage (IndexedDB via DexBee)
      const key = await saveGameToStorage()
      expect(key).toBe('hanafuda-save-single')

      // Reset stores to different state
      cardStore.reset()
      gameDataStore.reset()
      expect(cardStore.hand.p1.size).toBe(0)
      expect(gameDataStore.turnPhase).toBe('select')

      // Load from persistent storage (IndexedDB via DexBee)
      const success = await loadGameFromStorage('hanafuda-save-single')
      expect(success).toBe(true)
      expect(gameDataStore.gameId).toBe(originalGameId)
      expect(gameDataStore.turnPhase).toBe(originalPhase)
      expect(Array.from(cardStore.hand.p1)).toEqual(originalP1Hand)
    } finally {
      // Clean up: remove the saved game data to prevent test pollution
      // This ensures cleanup even if the test fails
      await deleteSavedGame('hanafuda-save-single').catch(() => {
        // Ignore if save doesn't exist or already deleted
      })
    }
  })

  it('should handle invalid localStorage data gracefully', async () => {
    const { loadGameFromStorage } = await getStoreManager()

    // Test with invalid JSON
    vi.mocked(localStorage.getItem).mockReturnValue('invalid json')

    const success = await loadGameFromStorage('invalid-key')
    expect(success).toBe(false)

    // Test with missing key
    vi.mocked(localStorage.getItem).mockReturnValue(null)

    const success2 = await loadGameFromStorage('missing-key')
    expect(success2).toBe(false)
  })

  it('should protect against card state tampering', async () => {
    const cardStore = useCardStore()

    // Export current state to get proper encrypted format
    cardStore.dealCards()
    const exported = await cardStore.exportSerializedState(undefined, 'test-game-id')
    const exportedData = JSON.parse(exported)

    expect(exportedData).toHaveProperty('encryptedData')
    expect(exportedData).toHaveProperty('hash')
    expect(exportedData).toHaveProperty('hashAlgorithm', 'fnv1a-mixed')
    expect(exportedData).toHaveProperty('version', '1.0.0')

    // Test that tampering is detected - modify encrypted data
    const tamperedData = {
      ...exportedData,
      encryptedData: exportedData.encryptedData.slice(0, -10) + 'tampered', // Tamper with encrypted data
      // Keep original hash - this should fail verification
    }

    const success = await cardStore.importSerializedState(
      JSON.stringify(tamperedData),
      undefined,
      'test-game-id',
    )
    expect(success).toBe(false)
  })

  it('should detect cross-store tampering with associated data salt', async () => {
    const { serializeGameState, deserializeGameState } = await getStoreManager()
    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()

    // Set up initial state
    cardStore.dealCards()
    gameDataStore.startRound()

    // Serialize the complete game state
    const serialized = await serializeGameState()
    const parsedState = JSON.parse(JSON.stringify(serialized))

    // Tamper with non-card data (change round counter)
    const tamperedGameData = JSON.parse(parsedState.gameData)
    tamperedGameData.roundCounter = 999 // Change round counter
    parsedState.gameData = JSON.stringify(tamperedGameData)

    // Try to restore - should fail because card hash was created with original round counter
    const success = await deserializeGameState(parsedState)
    expect(success).toBe(false)
  })

  it('should detect tampering when player data is modified', async () => {
    const { serializeGameState, deserializeGameState } = await getStoreManager()
    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()

    // Set up initial state
    cardStore.dealCards()
    gameDataStore.startRound()

    // Serialize the complete game state
    const serialized = await serializeGameState()
    const parsedState = JSON.parse(JSON.stringify(serialized))

    // Tamper with player data (change active player)
    const tamperedPlayerData = JSON.parse(parsedState.players)
    tamperedPlayerData.players.p1.isActive = false
    tamperedPlayerData.players.p2.isActive = true
    parsedState.players = JSON.stringify(tamperedPlayerData)

    // Try to restore - should fail because card hash includes player active state
    const success = await deserializeGameState(parsedState)
    expect(success).toBe(false)
  })
})
