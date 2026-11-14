import {
  collection,
  doc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  runTransaction,
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
  const status = typeof data.status === 'string' ? data.status : undefined

  const hasValidGameId = typeof data.gameId === 'string' && data.gameId !== ''
  const hasGameState = !!data.gameState
  const hasValidP1 = typeof data.p1 === 'string' && data.p1 !== ''

  // For active / completed games, p2 must be a non-empty string.
  // For waiting games, p2 may legitimately be empty until an opponent joins.
  const hasValidP2 =
    typeof data.p2 === 'string' &&
    (data.p2 !== '' || status === 'waiting' || status === 'abandoned' || status === 'cancelled')

  const hasValidActivePlayer = typeof data.activePlayer === 'string' && data.activePlayer !== ''

  // Validate required fields
  if (!hasValidGameId || !hasGameState || !hasValidP1 || !hasValidP2 || !hasValidActivePlayer) {
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

  const roundAcks =
    data.roundAcks &&
    typeof data.roundAcks === 'object' &&
    typeof (data.roundAcks as any).round === 'number' &&
    typeof (data.roundAcks as any).p1 === 'boolean' &&
    typeof (data.roundAcks as any).p2 === 'boolean'
      ? {
          round: (data.roundAcks as any).round,
          p1: (data.roundAcks as any).p1,
          p2: (data.roundAcks as any).p2,
        }
      : null

  const finalSeen =
    data.finalSeen &&
    typeof data.finalSeen === 'object' &&
    typeof (data.finalSeen as any).p1 === 'boolean' &&
    typeof (data.finalSeen as any).p2 === 'boolean'
      ? {
          p1: (data.finalSeen as any).p1,
          p2: (data.finalSeen as any).p2,
        }
      : null

  const terminalStatus =
    typeof data.terminalStatus === 'string' && data.terminalStatus.length > 0
      ? (data.terminalStatus as any)
      : null

  // Forfeit fields (optional)
  const forfeitedBy =
    typeof data.forfeitedBy === 'string' && data.forfeitedBy.length > 0 ? data.forfeitedBy : null
  const forfeitReason =
    typeof data.forfeitReason === 'string' && data.forfeitReason.length > 0
      ? (data.forfeitReason as any)
      : null

  return {
    gameId: data.gameId,
    gameState: data.gameState,
    mode: 'multiplayer',
    p1: data.p1,
    p2: data.p2,
    activePlayer: data.activePlayer,
    status: data.status,
    roundAcks,
    finalSeen,
    terminalStatus,
    forfeitedBy,
    forfeitReason,
    lastUpdated,
    createdAt,
  } as MultiplayerGame
}

/**
 * A player may set their own round-ack bit and must leave the opponent's bit alone.
 * Matches the multiplayer_games rules.
 */
function isHonestOwnAck(
  previous: { p1?: boolean; p2?: boolean } | null,
  next: { round?: number; p1?: boolean; p2?: boolean } | null,
  callerUid: string,
  p1Uid: unknown,
): boolean {
  if (!next || typeof next.round !== 'number') return false
  const previousP1 = previous?.p1 === true
  const previousP2 = previous?.p2 === true
  if (callerUid === p1Uid) {
    return next.p1 === true && next.p2 === previousP2
  }
  return next.p2 === true && next.p1 === previousP1
}

export function useMultiplayerSyncAdapter(): MultiplayerSyncAdapter {
  const db = getFirestore()

  return {
    name: 'firestore-multiplayer-games',

    async get(gameId: string, cached?: boolean): Promise<MultiplayerGame | null> {
      try {
        const docRef = doc(db, 'multiplayer_games', gameId)
        const docSnapshot = cached ? await getDocFromCache(docRef) : await getDocFromServer(docRef)

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
          mode: 'multiplayer' as const,
          p1: game.p1,
          p2: game.p2,
          activePlayer: game.activePlayer,
          status: game.status,
          roundAcks: game.roundAcks ?? null,
          finalSeen: game.finalSeen ?? null,
          terminalStatus: game.terminalStatus ?? null,
          forfeitedBy: game.forfeitedBy ?? null,
          forfeitReason: game.forfeitReason ?? null,
          lastUpdated:
            game.lastUpdated instanceof Date
              ? Timestamp.fromDate(game.lastUpdated)
              : game.lastUpdated,
          createdAt:
            game.createdAt instanceof Date ? Timestamp.fromDate(game.createdAt) : game.createdAt,
        }

        // Rules lock p1, p2, mode, and createdAt. Turn fields (gameState,
        // activePlayer) can change only for the current active player, or for
        // either player when both have acked and this write deals the next round.
        await runTransaction(db, async (tx) => {
          const existingSnap = await tx.get(docRef)
          if (!existingSnap.exists()) {
            tx.set(docRef, firestoreData)
            return
          }

          const existing = existingSnap.data()
          const isActive = existing.activePlayer === callerUid
          const acks = existing.roundAcks as { p1?: boolean; p2?: boolean } | null
          const bothAcked = !!acks && acks.p1 === true && acks.p2 === true
          const advancing = bothAcked && firestoreData.roundAcks == null
          const next: Record<string, unknown> = {
            ...firestoreData,
            p1: existing.p1,
            p2: existing.p2,
            mode: 'multiplayer',
            gameId: existing.gameId ?? firestoreData.gameId,
            createdAt: existing.createdAt ?? firestoreData.createdAt,
          }

          if (!isActive && !advancing) {
            next.gameState = existing.gameState
            next.activePlayer = existing.activePlayer
            // A metadata save (leave, forfeit, final close) must not clear the
            // opponent's ack. Own-ack writes still go through.
            if (
              !isHonestOwnAck(
                acks,
                firestoreData.roundAcks as { round?: number; p1?: boolean; p2?: boolean } | null,
                callerUid,
                existing.p1,
              )
            ) {
              next.roundAcks = existing.roundAcks ?? null
            }
          }

          tx.set(docRef, next, { merge: true })
        })
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
