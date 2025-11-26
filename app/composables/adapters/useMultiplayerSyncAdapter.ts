import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import type { MultiplayerGame } from '~~/types/profile'

/**
 * Multiplayer game sync adapter for Firestore
 * Collection: multiplayer_games
 * Document ID: ${gameId}
 *
 * This adapter manages shared multiplayer game states that both players access.
 * Only the active player should be allowed to push updates.
 */
export interface MultiplayerSyncAdapter {
  name: string

  /**
   * Get a specific multiplayer game by gameId
   * @returns MultiplayerGame if found and valid, null if not found or if required fields are missing/invalid
   * @throws Error if Firestore operation fails
   *
   * Validates required fields (gameId, gameState, p1, p2, activePlayer) and returns null
   * if any are missing, null, undefined, or have incorrect types. lastUpdated and createdAt
   * default to current Date if missing.
   */
  get(gameId: string): Promise<MultiplayerGame | null>

  /**
   * Get all multiplayer games for a user (as p1 or p2)
   * @returns Array of valid MultiplayerGame objects, sorted by lastUpdated descending
   *
   * Skips documents with missing/invalid required fields (gameId, gameState, p1, p2, activePlayer).
   * lastUpdated and createdAt default to current Date if missing.
   */
  list(uid: string): Promise<MultiplayerGame[]>

  /**
   * Create or update a multiplayer game
   * Should validate that the caller is the active player
   */
  push(game: MultiplayerGame, callerUid: string): Promise<boolean>

  /**
   * Delete a multiplayer game
   * Should validate that the caller is a participant
   */
  remove(gameId: string, callerUid: string): Promise<boolean>

  /**
   * Check if Firestore is available
   */
  isAvailable(): Promise<boolean>
}

/**
 * Validates and converts raw Firestore data to MultiplayerGame
 * @param data Raw Firestore document data
 * @param docId Optional document ID for error logging
 * @returns MultiplayerGame if valid, null if invalid
 */
function parseMultiplayerGame(
  data: Record<string, unknown>,
  docId?: string,
): MultiplayerGame | null {
  // Validate required fields
  if (
    typeof data.gameId !== 'string' ||
    data.gameId === '' ||
    !data.gameState ||
    typeof data.p1 !== 'string' ||
    data.p1 === '' ||
    typeof data.p2 !== 'string' ||
    data.p2 === '' ||
    typeof data.activePlayer !== 'string' ||
    data.activePlayer === ''
  ) {
    console.error('Invalid multiplayer game data: missing or invalid required fields', {
      docId,
      gameId: data.gameId,
      hasGameState: !!data.gameState,
      p1: data.p1,
      p2: data.p2,
      activePlayer: data.activePlayer,
    })
    return null
  }

  // Convert Firestore Timestamps to Dates, with fallback handling
  const convertTimestamp = (value: unknown): Date => {
    // Firestore Timestamp
    if (value instanceof Timestamp) {
      return value.toDate()
    }
    // Already a Date
    if (value instanceof Date) {
      return value
    }
    // Object with toDate method (Firestore Timestamp-like)
    if (
      value &&
      typeof value === 'object' &&
      'toDate' in value &&
      typeof value.toDate === 'function'
    ) {
      return value.toDate()
    }
    // Parsable value (string, number, etc.)
    if (value != null) {
      const parsed = new Date(value as string | number)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
    }
    // Default to current date if invalid
    return new Date()
  }

  const lastUpdated = convertTimestamp(data.lastUpdated)
  const createdAt = convertTimestamp(data.createdAt)

  return {
    gameId: data.gameId,
    gameState: data.gameState,
    mode: 'multiplayer',
    p1: data.p1,
    p2: data.p2,
    activePlayer: data.activePlayer,
    lastUpdated,
    createdAt,
  } as MultiplayerGame
}

export function useMultiplayerSyncAdapter(): MultiplayerSyncAdapter {
  const db = getFirestore()

  return {
    name: 'firestore-multiplayer-games',

    async get(gameId: string): Promise<MultiplayerGame | null> {
      try {
        const docRef = doc(db, 'multiplayer_games', gameId)
        const docSnapshot = await getDoc(docRef)

        if (!docSnapshot.exists()) {
          return null
        }

        const data = docSnapshot.data()

        const game = parseMultiplayerGame(data, docSnapshot.id)
        if (!game) {
          return null
        }

        return game
      } catch (error) {
        console.error('Firestore multiplayer game get error:', error)
        throw error
      }
    },

    async list(uid: string): Promise<MultiplayerGame[]> {
      try {
        const gamesRef = collection(db, 'multiplayer_games')

        // Query for games where user is p1 or p2
        // Note: Firestore doesn't support OR queries directly, so we need two queries
        const q1 = query(gamesRef, where('p1', '==', uid))
        const q2 = query(gamesRef, where('p2', '==', uid))

        const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)])

        const games: MultiplayerGame[] = []
        const processedIds = new Set<string>()

        // Process both snapshots, avoiding duplicates
        for (const docSnapshot of [...snapshot1.docs, ...snapshot2.docs]) {
          if (processedIds.has(docSnapshot.id)) continue
          processedIds.add(docSnapshot.id)

          const data = docSnapshot.data()

          const game = parseMultiplayerGame(data, docSnapshot.id)
          if (!game) {
            continue
          }

          games.push(game)
        }

        // Sort by lastUpdated descending (most recent first)
        games.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())

        return games
      } catch (error) {
        console.error('Firestore multiplayer games list error:', error)
        throw error
      }
    },

    async push(game: MultiplayerGame, callerUid: string): Promise<boolean> {
      try {
        // Validate that caller is the active player
        if (game.activePlayer !== callerUid) {
          console.error(
            `Push denied: caller ${callerUid} is not the active player ${game.activePlayer}`,
          )
          return false
        }

        // Validate that caller is a participant
        if (game.p1 !== callerUid && game.p2 !== callerUid) {
          console.error(
            `Push denied: caller ${callerUid} is not a participant in game ${game.gameId}`,
          )
          return false
        }

        const docRef = doc(db, 'multiplayer_games', game.gameId)

        // Convert Dates to Firestore Timestamps
        const firestoreData = {
          gameId: game.gameId,
          gameState: game.gameState,
          mode: 'multiplayer',
          p1: game.p1,
          p2: game.p2,
          activePlayer: game.activePlayer,
          lastUpdated:
            game.lastUpdated instanceof Date
              ? Timestamp.fromDate(game.lastUpdated)
              : game.lastUpdated,
          createdAt:
            game.createdAt instanceof Date ? Timestamp.fromDate(game.createdAt) : game.createdAt,
        }

        await setDoc(docRef, firestoreData, { merge: true })
        return true
      } catch (error) {
        console.error('Firestore multiplayer game push error:', error)
        return false
      }
    },

    async remove(gameId: string, callerUid: string): Promise<boolean> {
      try {
        const docRef = doc(db, 'multiplayer_games', gameId)

        await runTransaction(db, async (tx) => {
          // Read the document within the transaction
          const docSnapshot = await tx.get(docRef)

          // Validate that the document exists
          if (!docSnapshot.exists()) {
            // Game doesn't exist, nothing to remove - this is fine
            return
          }

          const data = docSnapshot.data()

          // Validate that callerUid matches p1 or p2
          if (data.p1 !== callerUid && data.p2 !== callerUid) {
            console.error(
              `Remove denied: caller ${callerUid} is not a participant in game ${gameId}`,
            )
            throw new Error(`Unauthorized: caller ${callerUid} is not a participant`)
          }

          // Delete the document within the transaction
          tx.delete(docRef)
        })

        return true
      } catch (error) {
        // If it's an authorization error, return false
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return false
        }
        console.error('Firestore multiplayer game remove error:', error)
        return false
      }
    },

    async isAvailable(): Promise<boolean> {
      try {
        // Simple check - can be enhanced with network detection
        return typeof window !== 'undefined' && navigator.onLine
      } catch {
        return false
      }
    },
  }
}
