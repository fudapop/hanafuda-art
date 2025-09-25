import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStoreManager } from '~/composables/useStoreManager'
import { useCardStore } from '~/stores/cardStore'
import { useConfigStore } from '~/stores/configStore'
import { useGameDataStore } from '~/stores/gameDataStore'
import { usePlayerStore } from '~/stores/playerStore'

describe('useStoreManager', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    // Mock localStorage for Node.js environment
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        key: vi.fn(),
        length: 0,
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

  it('should serialize game state correctly', () => {
    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()

    const { serializeGameState } = useStoreManager()

    // Set up some test data
    cardStore.dealCards()
    gameDataStore.startRound()

    const serialized = serializeGameState()

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
  })

  it('should deserialize and restore game state correctly', () => {
    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()

    const { serializeGameState, deserializeGameState } = useStoreManager()

    // Set up initial state
    cardStore.dealCards()
    gameDataStore.startRound()
    gameDataStore.nextPhase() // Move to draw phase

    const originalGameId = gameDataStore.gameId
    const originalPhase = gameDataStore.turnPhase
    const originalP1Hand = Array.from(cardStore.hand.p1)

    // Serialize the state
    const serialized = serializeGameState()

    // Reset stores to different state
    cardStore.reset()
    gameDataStore.reset()

    // Verify state was reset
    expect(cardStore.hand.p1.size).toBe(0)
    expect(gameDataStore.turnPhase).toBe('select')

    // Restore from serialized state
    const success = deserializeGameState(serialized)

    expect(success).toBe(true)
    expect(gameDataStore.gameId).toBe(originalGameId)
    expect(gameDataStore.turnPhase).toBe(originalPhase)
    expect(Array.from(cardStore.hand.p1)).toEqual(originalP1Hand)
  })

  it('should handle localStorage save and load', () => {
    const { saveGameToStorage, loadGameFromStorage } = useStoreManager()

    const mockStorageData = JSON.stringify({
      version: '1.0.0',
      timestamp: Date.now(),
      gameId: 'test-game-id',
      cards: (() => {
        // Generate a properly hashed card store state for testing with salt
        const cardStore = useCardStore()
        const gameDataStore = useGameDataStore()
        const playerStore = usePlayerStore()
        const configStore = useConfigStore()
        
        // Generate the same salt that would be used in the real system
        const saltComponents = [
          'test-game-id',
          '1',           // roundCounter
          '1',           // turnCounter
          'select',      // turnPhase
          'p1',          // activePlayer.id
          '1',           // bonusMultiplier
          '3',           // maxRounds
          'allow'        // allowViewingsYaku
        ]
        const salt = saltComponents.join('|')
        
        return cardStore.exportSerializedState(salt)
      })(),
      gameData: JSON.stringify({
        gameId: 'test-game-id',
        roundHistory: [],
        roundCounter: 1,
        turnCounter: 1,
        turnPhase: 'select',
        roundOver: false,
        gameOver: false,
        eventHistory: [],
      }),
      players: JSON.stringify({
        players: {
          p1: { id: 'p1', name: 'Player 1', isActive: true, isDealer: true },
          p2: { id: 'p2', name: 'Player 2', isActive: false, isDealer: false },
        },
        bonusMultiplier: 1,
      }),
      config: JSON.stringify({
        maxRounds: 3,
        allowViewingsYaku: 'allow',
        doubleScoreOverSeven: false,
        sakeIsWildCard: false,
        cardLabels: false,
        cardSizeMultiplier: 1.0,
        settingsLoaded: true,
      }),
    })

    // Mock localStorage.setItem and getItem
    vi.mocked(localStorage.setItem).mockImplementation(() => {})
    vi.mocked(localStorage.getItem).mockReturnValue(mockStorageData)

    // Test save
    const key = saveGameToStorage('test-key')
    expect(localStorage.setItem).toHaveBeenCalledWith('test-key', expect.any(String))
    expect(key).toBe('test-key')

    // Test load
    const success = loadGameFromStorage('test-key')
    expect(localStorage.getItem).toHaveBeenCalledWith('test-key')
    expect(success).toBe(true)
  })

  it('should handle invalid localStorage data gracefully', () => {
    const { loadGameFromStorage } = useStoreManager()

    // Test with invalid JSON
    vi.mocked(localStorage.getItem).mockReturnValue('invalid json')

    const success = loadGameFromStorage('invalid-key')
    expect(success).toBe(false)

    // Test with missing key
    vi.mocked(localStorage.getItem).mockReturnValue(null)

    const success2 = loadGameFromStorage('missing-key')
    expect(success2).toBe(false)
  })

  it('should protect against card state tampering', () => {
    const cardStore = useCardStore()
    
    // Export current state to get proper hash format
    cardStore.dealCards()
    const exported = cardStore.exportSerializedState()
    const exportedData = JSON.parse(exported)
    
    expect(exportedData).toHaveProperty('data')
    expect(exportedData).toHaveProperty('hash')
    expect(exportedData).toHaveProperty('hashAlgorithm', 'fnv1a-mixed')
    expect(exportedData).toHaveProperty('version', '1.0.0')
    
    // Test that tampering is detected
    const tamperedData = {
      ...exportedData,
      data: {
        ...exportedData.data,
        hand: { p1: ['invalid-card'], p2: [] } // Tamper with hand
      }
      // Keep original hash - this should fail verification
    }
    
    const success = cardStore.importSerializedState(JSON.stringify(tamperedData))
    expect(success).toBe(false)
  })

  it('should detect cross-store tampering with associated data salt', () => {
    const { serializeGameState, deserializeGameState } = useStoreManager()
    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()
    
    // Set up initial state
    cardStore.dealCards()
    gameDataStore.startRound()
    
    // Serialize the complete game state
    const serialized = serializeGameState()
    const parsedState = JSON.parse(JSON.stringify(serialized))
    
    // Tamper with non-card data (change round counter)
    const tamperedGameData = JSON.parse(parsedState.gameData)
    tamperedGameData.roundCounter = 999 // Change round counter
    parsedState.gameData = JSON.stringify(tamperedGameData)
    
    // Try to restore - should fail because card hash was created with original round counter
    const success = deserializeGameState(parsedState)
    expect(success).toBe(false)
  })

  it('should detect tampering when player data is modified', () => {
    const { serializeGameState, deserializeGameState } = useStoreManager()
    const cardStore = useCardStore()
    const gameDataStore = useGameDataStore()
    
    // Set up initial state
    cardStore.dealCards()
    gameDataStore.startRound()
    
    // Serialize the complete game state
    const serialized = serializeGameState()
    const parsedState = JSON.parse(JSON.stringify(serialized))
    
    // Tamper with player data (change active player)
    const tamperedPlayerData = JSON.parse(parsedState.players)
    tamperedPlayerData.players.p1.isActive = false
    tamperedPlayerData.players.p2.isActive = true
    parsedState.players = JSON.stringify(tamperedPlayerData)
    
    // Try to restore - should fail because card hash includes player active state
    const success = deserializeGameState(parsedState)
    expect(success).toBe(false)
  })
})
