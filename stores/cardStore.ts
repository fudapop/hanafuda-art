/**
 * @fileoverview Card Store
 *
 * Manages all card-related state during Hanafuda gameplay including player hands,
 * field cards, deck, and collections. Provides methods to move cards around the
 * table while maintaining game integrity through card counting and validation.
 *
 * Features:
 * - Card position tracking (hands, field, deck, collections)
 * - Atomic card operations with integrity checking
 * - Game state serialization with versioned hash-based tampering protection
 * - Card dealing, collecting, and staging operations
 * - Automatic card shuffling and deck management
 *
 * State Structure:
 * - hand: Cards currently held by each player
 * - collection: Cards captured by each player
 * - field: Cards currently on the playing field
 * - deck: Remaining cards in the draw pile
 * - staged: Cards temporarily staged for collection
 *
 * @example
 * ```typescript
 * const cardStore = useCardStore()
 *
 * // Deal initial cards
 * cardStore.dealCards()
 *
 * // Move card from hand to field
 * cardStore.discard('matsu-ni-tsuru', 'p1')
 *
 * // Check game integrity
 * const isValid = cardStore.integrityCheck
 * ```
 */

import { defineStore } from 'pinia'
import { type PlayerKey } from '~/stores/playerStore'
import { type CardName, DECK, shuffle } from '~/utils/cards'

type PlayerCardSet = Record<PlayerKey, Set<CardName>>

export interface CardStoreState {
  hand: PlayerCardSet
  collection: PlayerCardSet
  field: Set<CardName>
  deck: Set<CardName>
  staged: Set<CardName>
}

export const useCardStore = defineStore('cards', {
  state: (): CardStoreState => ({
    // Cards in players' hands
    hand: {
      p1: new Set([]),
      p2: new Set([]),
    },
    // Cards collected by each player
    collection: {
      p1: new Set([]),
      p2: new Set([]),
    },
    // Cards staged for collection
    staged: new Set([]),
    // Cards not held by a player
    field: new Set([]),
    deck: new Set(shuffle([...DECK])),
    // deck: new Set([...TEST_DECKS.teshi]),
  }),
  getters: {
    cardsInPlay: (state) => [...state.hand.p1, ...state.hand.p2, ...state.field, ...state.deck],
    cardsCollected: (state) => [...state.collection.p1, ...state.collection.p2],
    handsEmpty: (state) => [state.hand.p1, state.hand.p2].every((hand) => hand.size === 0),
    // Getter returns a function
    handNotEmpty: (state) => (player: PlayerKey) => state.hand[player].size > 0,
    // Non-arrow function to allow use of 'this'
    integrityCheck(): boolean {
      const total = this.cardsInPlay.length + this.cardsCollected.length
      const valid = total === DECK.length
      console.assert(valid, 'Deck size mismatch detected. Errors may occur.')
      return valid
    },
  },
  actions: {
    // Deal the initial hands and field
    dealCards() {
      this.$patch((state) => {
        const cards = [...state.deck].slice(0, 24)
        this.addCards(cards.slice(0, 8), state.hand.p1)
        this.addCards(cards.slice(8, 16), state.hand.p2)
        this.addCards(cards.slice(16), state.field)
        this.removeCards(cards, state.deck)
      })
    },
    // Show top card from the deck
    revealCard() {
      const cards = [...this.deck].slice(0, 1)
      return cards[0]
    },
    // Move card from hand/deck to the field
    discard(card: CardName, player: PlayerKey) {
      this.$patch((state) => {
        state.hand[player].delete(card)
        state.deck.delete(card)
        state.field.add(card)
      })
      if (this.staged.size) this.collectCards(player)
    },
    stageForCollection(cards: CardName[]) {
      // Not included in the Integrity Check
      this.addCards(cards, this.staged)
    },
    // Move cards from hand and field to a player's collection
    collectCards(player: PlayerKey) {
      const arr = [...this.staged]
      this.$patch((state) => {
        this.addCards(arr, state.collection[player])
        this.removeCards(arr, state.hand[player])
        this.removeCards(arr, state.field)
        this.removeCards(arr, state.deck)
        state.staged.clear()
      })
    },
    // Utility methods
    addCards(arr: CardName[], toSet: Set<CardName>) {
      for (const card of arr) {
        toSet.add(card)
      }
    },
    removeCards(arr: CardName[], fromSet: Set<CardName>) {
      for (const card of arr) {
        fromSet.delete(card)
      }
    },
    reset() {
      this.$patch((state) => {
        for (const p in state.collection) state.collection[p as PlayerKey].clear()
        for (const p in state.hand) state.hand[p as PlayerKey].clear()
        state.staged.clear()
        state.field.clear()
        state.deck = new Set(shuffle([...DECK]))
      })
    },
    async exportSerializedState(associatedDataSalt?: string, gameId?: string): Promise<string> {
      const serializable = {
        hand: {
          p1: Array.from(this.hand.p1),
          p2: Array.from(this.hand.p2),
        },
        collection: {
          p1: Array.from(this.collection.p1),
          p2: Array.from(this.collection.p2),
        },
        field: Array.from(this.field),
        deck: Array.from(this.deck),
        staged: Array.from(this.staged),
      }

      // Encrypt card data to prevent plain text visibility
      const dataString = JSON.stringify(serializable)
      const encryptedData = await this._encryptCardData(dataString, gameId)

      // Add integrity hash to prevent tampering, using associated data as salt
      // Hash the encrypted data to verify it hasn't been tampered with
      const hash = this._generateHashWithAlgorithm(encryptedData, associatedDataSalt, 'fnv1a-mixed')

      return JSON.stringify({
        encryptedData,
        hash,
        hashAlgorithm: 'fnv1a-mixed',
        version: '1.0.0',
      })
    },
    async importSerializedState(
      serializedState: string,
      associatedDataSalt?: string,
      gameId?: string,
    ): Promise<boolean> {
      try {
        const parsed = JSON.parse(serializedState)

        // Handle both encrypted (new) and plain text (legacy) formats
        let data: any

        if (parsed.encryptedData) {
          // New encrypted format
          if (!parsed.hash || !parsed.version) {
            throw new Error('Invalid save format - missing required fields')
          }

          const { encryptedData, hash: expectedHash, hashAlgorithm } = parsed

          // Verify integrity hash with appropriate algorithm
          const actualHash = this._generateHashWithAlgorithm(
            encryptedData,
            associatedDataSalt,
            hashAlgorithm,
          )

          if (actualHash !== expectedHash) {
            throw new Error(
              'Save data integrity verification failed - data may have been tampered with',
            )
          }

          // Decrypt the card data
          const decryptedString = await this._decryptCardData(encryptedData, gameId)
          data = JSON.parse(decryptedString)
        } else if (parsed.data) {
          // Legacy plain text format (backward compatibility)
          if (!parsed.hash || !parsed.version) {
            throw new Error('Invalid save format - missing required fields')
          }

          const { data: plainData, hash: expectedHash, hashAlgorithm } = parsed

          // Verify integrity hash with appropriate algorithm
          const dataString = JSON.stringify(plainData)
          const actualHash = this._generateHashWithAlgorithm(
            dataString,
            associatedDataSalt,
            hashAlgorithm,
          )

          if (actualHash !== expectedHash) {
            throw new Error(
              'Save data integrity verification failed - data may have been tampered with',
            )
          }

          data = plainData
        } else {
          throw new Error('Invalid save format - missing data or encryptedData field')
        }

        // Validate structure
        if (!data.hand || !data.collection || !data.field || !data.deck || !data.staged) {
          throw new Error('Invalid card store state structure')
        }

        this.$patch((state) => {
          state.hand.p1 = new Set(data.hand.p1 || [])
          state.hand.p2 = new Set(data.hand.p2 || [])
          state.collection.p1 = new Set(data.collection.p1 || [])
          state.collection.p2 = new Set(data.collection.p2 || [])
          state.field = new Set(data.field || [])
          state.deck = new Set(data.deck || [])
          state.staged = new Set(data.staged || [])
        })

        return true
      } catch (error) {
        console.error('Failed to import card store state:', error)
        return false
      }
    },

    // Algorithm-aware hash generation for backward compatibility
    _generateHashWithAlgorithm(
      data: string,
      associatedDataSalt?: string,
      algorithm?: string,
    ): string {
      switch (algorithm) {
        case 'fnv1a-mixed':
          return this._generateFNV1aMixedHash(data, associatedDataSalt)
        case 'simple': // For backward compatibility with very old saves
          return this._generateSimpleHash(data, associatedDataSalt)
        default:
          // Default to current algorithm for saves without hashAlgorithm field
          return this._generateFNV1aMixedHash(data, associatedDataSalt)
      }
    },

    // Current hash method - FNV-1a with additional mixing
    _generateFNV1aMixedHash(data: string, associatedDataSalt?: string): string {
      // Get base salt from runtime config or fallback
      const config = useRuntimeConfig()
      const baseSalt = config.public.saveIntegritySalt || 'hanafuda-fallback-2024'
      const fullData = data + baseSalt + (associatedDataSalt || '')

      // Improved hash function using FNV-1a with additional mixing
      let hash = 0x811c9dc5 // FNV-1a 32-bit offset basis

      for (let i = 0; i < fullData.length; i++) {
        // XOR with byte
        hash ^= fullData.charCodeAt(i)
        // Multiply by FNV-1a prime
        hash = Math.imul(hash, 0x01000193)
      }

      // Additional mixing to improve distribution
      hash ^= hash >>> 16
      hash = Math.imul(hash, 0x21f0aaad)
      hash ^= hash >>> 15
      hash = Math.imul(hash, 0x735a2d97)
      hash ^= hash >>> 15

      // Convert to unsigned 32-bit integer and then to hex
      return (hash >>> 0).toString(16).padStart(8, '0')
    },

    // Legacy simple hash for backward compatibility (if needed)
    _generateSimpleHash(data: string, associatedDataSalt?: string): string {
      // Simple hash function for backward compatibility
      let hash = 0
      const config = useRuntimeConfig()
      const baseSalt = config.public.saveIntegritySalt || 'hanafuda-fallback-2024'
      const fullData = data + baseSalt + (associatedDataSalt || '')

      for (let i = 0; i < fullData.length; i++) {
        const char = fullData.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32-bit integer
      }

      return hash.toString(36) // Base36 for shorter hash
    },

    /**
     * Derives an encryption key from gameId and salt using PBKDF2
     */
    async _deriveEncryptionKey(gameId?: string): Promise<CryptoKey> {
      const config = useRuntimeConfig()
      const baseSalt = config.public.saveIntegritySalt || 'hanafuda-fallback-2024'

      // Combine gameId and salt for key derivation
      const keyMaterial = gameId ? `${gameId}|${baseSalt}` : baseSalt
      const encoder = new TextEncoder()
      const keyData = encoder.encode(keyMaterial)

      // Import the password/key material as raw bytes for PBKDF2
      const importedKey = await crypto.subtle.importKey('raw', keyData, 'PBKDF2', false, [
        'deriveBits',
        'deriveKey',
      ])

      // Derive a 256-bit key using PBKDF2
      const saltBuffer = encoder.encode(baseSalt)
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: 100000,
          hash: 'SHA-256',
        },
        importedKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      )

      return derivedKey
    },

    /**
     * Encrypts card data using AES-GCM
     */
    async _encryptCardData(data: string, gameId?: string): Promise<string> {
      try {
        const key = await this._deriveEncryptionKey(gameId)
        const encoder = new TextEncoder()
        const dataBuffer = encoder.encode(data)

        // Generate a random IV (initialization vector)
        const iv = crypto.getRandomValues(new Uint8Array(12))

        // Encrypt the data
        const encryptedBuffer = await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: iv,
          },
          key,
          dataBuffer,
        )

        // Combine IV and encrypted data, then encode as base64
        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
        combined.set(iv, 0)
        combined.set(new Uint8Array(encryptedBuffer), iv.length)

        // Convert to base64 for storage
        return btoa(String.fromCharCode(...combined))
      } catch (error) {
        console.error('Failed to encrypt card data:', error)
        throw error
      }
    },

    /**
     * Decrypts card data using AES-GCM
     */
    async _decryptCardData(encryptedData: string, gameId?: string): Promise<string> {
      try {
        const key = await this._deriveEncryptionKey(gameId)

        // Decode from base64
        const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

        // Extract IV (first 12 bytes) and encrypted data
        const iv = combined.slice(0, 12)
        const encryptedBuffer = combined.slice(12)

        // Decrypt the data
        const decryptedBuffer = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: iv,
          },
          key,
          encryptedBuffer,
        )

        // Convert back to string
        const decoder = new TextDecoder()
        return decoder.decode(decryptedBuffer)
      } catch (error) {
        console.error('Failed to decrypt card data:', error)
        throw error
      }
    },
  },
})
