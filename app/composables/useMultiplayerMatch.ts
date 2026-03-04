/**
 * @fileoverview Multiplayer Match Composable
 *
 * Provides functionality for creating and joining multiplayer games using invite codes.
 * Handles invite code generation, validation, game creation, and real-time subscriptions.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import type { GameRules, InviteCode, MultiplayerGame } from '~~/types/profile'
import { useCardStore } from '~~/stores/cardStore'
import { useConfigStore } from '~~/stores/configStore'
import { usePlayerStore } from '~~/stores/playerStore'

export type OpponentPlayer = {
  uid: string
  username: string
  avatar: string
}

export type MultiplayerMatchComposable = {
  /**
   * Create new game and generate invite code
   * @returns Object with gameId and invite code
   * @throws Error if not authenticated or game creation fails
   */
  createGame: () => Promise<{ gameId: string; code: string }>

  /**
   * Join game via invite code
   * @param code The invite code to join with
   * @returns Object with gameId and success status
   * @throws Error with user-friendly message on validation failures
   */
  joinGame: (code: string) => Promise<{ gameId: string; success: boolean }>

  /**
   * Cancel a waiting game (creator only)
   * @param gameId The game ID to cancel
   * @returns True if successfully cancelled
   */
  cancelGame: (gameId: string) => Promise<boolean>

  /**
   * Check if opponent has joined (for polling)
   * @param gameId The game ID to check
   * @returns True if opponent has joined
   */
  checkOpponentJoined: (gameId: string) => Promise<boolean>

  /**
   * Subscribe to game status changes (real-time)
   * @param gameId The game ID to subscribe to
   * @param callback Function called when game updates
   * @returns Unsubscribe function
   */
  subscribeToGame: (gameId: string, callback: (game: MultiplayerGame) => void) => Unsubscribe

  /**
   * Validate invite code
   * @param code The invite code to validate
   * @returns Object with validity status, optional error, and host's matchRules when valid
   */
  validateInviteCode: (code: string) => Promise<{ valid: boolean; error?: string; matchRules?: GameRules }>

  /**
   * List active multiplayer games for current user
   * @returns Array of multiplayer games
   */
  listMyGames: () => Promise<MultiplayerGame[]>

  /**
   * Global reactive reference to the opponent player details for multiplayer games.
   * This is shared across the app and auto-persisted with useState.
   *
   * @returns Global Ref to the OpponentPlayer object, or null if not set.
   *
   * Usage:
   * const opponent = useOpponentPlayer()
   * opponent.value = { uid, username, avatar }
   */
  useOpponentPlayer: () => Ref<OpponentPlayer | null>

  setOpponentPlayer: (opponentUid: string) => Promise<void>
}

/**
 * Generate random 6-character alphanumeric invite code
 * Format: XXX-XXX (e.g., "ABC-123")
 * Uses characters excluding ambiguous ones (0, O, I, 1, etc.)
 */
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  // Format as XXX-XXX for readability
  return `${code.slice(0, 3)}-${code.slice(3)}`
}

/**
 * Normalize invite code by removing separators and converting to uppercase
 * Handles various input formats: "ABC-123", "abc123", "ABC 123", etc.
 */
const normalizeInviteCode = (code: string): string => {
  return code.replace(/[-\s]/g, '').toUpperCase()
}

/**
 * Format invite code with separator for display
 * Input: "ABC123" -> Output: "ABC-123"
 */
const formatInviteCode = (code: string): string => {
  const normalized = normalizeInviteCode(code)
  if (normalized.length !== 6) return normalized
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`
}

export const useMultiplayerMatch = (): MultiplayerMatchComposable => {
  const db = getFirestore()
  const { current: profile } = useProfile()
  const { saveMultiplayerGame, serializeGameState, syncMultiplayerGame, initializeSync } =
    useStoreManager()
  const { initializePresence, cleanup: cleanupPresence } = usePresence()

  const useOpponentPlayer = () =>
    useState<OpponentPlayer | null>('multiplayer-opponent', () => null)

  const setOpponentPlayer = async (opponentUid: string) => {
    const opponentDoc = await getDoc(doc(db, 'users', `u_${opponentUid}`))
    if (opponentDoc.exists()) {
      const opponent = useOpponentPlayer()
      const opponentData = opponentDoc.data()
      opponent.value = {
        uid: opponentData.uid,
        username: opponentData.username,
        avatar: opponentData.avatar,
      }

      // Also update the playerStore so the name persists through store resets
      const { opponentKey } = useLocalPlayerPerspective()
      const ps = usePlayerStore()
      if (opponentData.username) {
        ps.setPlayerName(opponentKey.value, opponentData.username)
      }
    }
  }

  const createGame = async (): Promise<{ gameId: string; code: string }> => {
    // 1. Verify authentication
    if (!profile.value) {
      throw new Error('Must be authenticated to create a multiplayer game')
    }

    // 2. Initialize new game state
    const cardStore = useCardStore()
    const configStore = useConfigStore()
    cardStore.reset()

    // 3. Serialize initial state
    const gameState = await serializeGameState()

    // 4. Generate unique invite code
    let code = generateInviteCode()
    let codeExists = true

    // Ensure code is unique (retry up to 10 times)
    let attempts = 0
    while (codeExists && attempts < 10) {
      const codeDoc = await getDoc(doc(db, 'invite_codes', code))
      if (!codeDoc.exists()) {
        codeExists = false
      } else {
        code = generateInviteCode()
        attempts++
      }
    }

    if (codeExists) {
      throw new Error('Failed to generate unique invite code. Please try again.')
    }

    // 5. Create multiplayer game document
    const gameId = gameState.gameId
    const now = new Date()
    const game: MultiplayerGame = {
      gameId,
      gameState,
      mode: 'multiplayer',
      p1: profile.value.uid,
      p2: '', // Empty until joined
      activePlayer: profile.value.uid, // Creator goes first
      status: 'waiting',
      roundAcks: null,
      finalSeen: { p1: false, p2: false },
      terminalStatus: null,
      inviteCode: code,
      matchRules: configStore.getGameRules,
      createdAt: now,
      lastUpdated: now,
    }

    await setDoc(doc(db, 'multiplayer_games', gameId), {
      ...game,
      createdAt: Timestamp.fromDate(game.createdAt),
      lastUpdated: Timestamp.fromDate(game.lastUpdated),
      startedAt: null, // Will be set when p2 joins
    })

    // 6. Create invite code document
    const inviteData: InviteCode = {
      code,
      gameId,
      createdBy: profile.value.uid,
      createdAt: now,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      used: false,
    }

    await setDoc(doc(db, 'invite_codes', code), {
      ...inviteData,
      createdAt: Timestamp.fromDate(inviteData.createdAt),
      expiresAt: Timestamp.fromDate(inviteData.expiresAt),
    })

    // 7. Save to local state (as waiting game)
    await saveMultiplayerGame(profile.value.uid, '', profile.value.uid)

    // 8. Initialize presence tracking for the game
    try {
      await initializePresence(gameId)
    } catch (error) {
      console.error('Failed to initialize presence for game:', error)
      // Continue without presence - game creation succeeded
    }

    return { gameId, code }
  }

  const joinGame = async (inputCode: string): Promise<{ gameId: string; success: boolean }> => {
    // 1. Verify authentication
    if (!profile.value) {
      throw new Error('Must be authenticated to join a multiplayer game')
    }

    // 2. Normalize code format
    const code = formatInviteCode(inputCode)

    // 3. Validate the invite code
    const validation = await validateInviteCode(code)
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid invite code')
    }

    // 4. Lookup invite code
    const codeDoc = await getDoc(doc(db, 'invite_codes', code))
    if (!codeDoc.exists()) {
      console.error(`Code ${code} does not exist`)
      throw new Error('Invalid invite code. Please check and try again.')
    }

    const inviteData = codeDoc.data() as InviteCode
    const gameId = inviteData.gameId

    // 5. Get game document
    const gameDoc = await getDoc(doc(db, 'multiplayer_games', gameId))
    if (!gameDoc.exists()) {
      throw new Error('Game not found. It may have been cancelled.')
    }

    const gameData = gameDoc.data()

    // 6. Additional validations
    if (gameData.p1 === profile.value.uid) {
      throw new Error('You cannot join your own game.')
    }

    if (gameData.p2 && gameData.p2 !== '') {
      throw new Error('This game already has two players.')
    }

    if (gameData.status !== 'waiting') {
      throw new Error('This game is no longer available to join.')
    }

    // 7. Choose starting player randomly between p1 and p2
    const hostUid = gameData.p1 as string
    const joinerUid = profile.value.uid
    const startingUid = Math.random() < 0.5 ? hostUid : joinerUid

    // 7.5 Set opponent player details
    await setOpponentPlayer(hostUid)

    // 8. Update game document (set p2, activePlayer, and change status to active)
    const now = new Date()
    await updateDoc(doc(db, 'multiplayer_games', gameId), {
      p2: profile.value.uid,
      activePlayer: startingUid,
      status: 'active',
      startedAt: Timestamp.fromDate(now),
      lastUpdated: Timestamp.fromDate(now),
    })

    // 9. Mark invite code as used
    await updateDoc(doc(db, 'invite_codes', code), {
      used: true,
      usedBy: profile.value.uid,
      usedAt: Timestamp.fromDate(now),
    })

    // 10. Pull latest multiplayer game state into local IndexedDB via StoreManager sync
    try {
      // Ensure sync adapters (including multiplayer adapter) are initialized
      initializeSync()

      const synced = await syncMultiplayerGame(gameId)
      if (!synced) {
      }
    } catch (error) {
      console.error('Error syncing multiplayer game after join:', error)
      // Do not fail the join flow if local sync fails; remote state is still valid
    }

    // 11. Cleanup any previous presence session and initialize new one
    try {
      await cleanupPresence()
      await initializePresence(gameId)
    } catch (error) {
      console.error('Failed to initialize presence for game:', error)
      // Continue without presence - join succeeded in Firestore
    }

    return { gameId, success: true }
  }

  const cancelGame = async (gameId: string): Promise<boolean> => {
    if (!profile.value) {
      return false
    }

    try {
      const gameDoc = await getDoc(doc(db, 'multiplayer_games', gameId))
      if (!gameDoc.exists()) {
        console.error(`Game ${gameId} does not exist`)
        return false
      }

      const gameData = gameDoc.data()

      // Only creator can cancel, and only while waiting
      if (gameData.p1 !== profile.value.uid || gameData.status !== 'waiting') {
        return false
      }

      // Update game status to abandoned
      await updateDoc(doc(db, 'multiplayer_games', gameId), {
        status: 'abandoned',
        lastUpdated: Timestamp.fromDate(new Date()),
      })

      // Invalidate invite code
      if (gameData.inviteCode) {
        const codeDoc = await getDoc(doc(db, 'invite_codes', gameData.inviteCode))
        if (codeDoc.exists()) {
          await deleteDoc(doc(db, 'invite_codes', gameData.inviteCode))
        }
      }

      // Cleanup presence tracking (non-blocking)
      try {
        await cleanupPresence()
      } catch (error) {
        console.error('Failed to cleanup presence:', error)
        // Continue - cancellation succeeded
      }

      return true
    } catch (error) {
      console.error('Error cancelling game:', error)
      return false
    }
  }

  const checkOpponentJoined = async (gameId: string): Promise<boolean> => {
    try {
      const gameDoc = await getDoc(doc(db, 'multiplayer_games', gameId))
      if (!gameDoc.exists()) {
        return false
      }

      const gameData = gameDoc.data()
      const hasJoined = gameData.status === 'active' && gameData.p2 !== ''

      if (hasJoined) {
        await setOpponentPlayer(gameData.p2)
      }

      return hasJoined
    } catch (error) {
      console.error('Error checking opponent joined:', error)
      return false
    }
  }

  const subscribeToGame = (
    gameId: string,
    callback: (game: MultiplayerGame) => void,
  ): Unsubscribe => {
    const docRef = doc(db, 'multiplayer_games', gameId)

    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()

        // Convert Timestamps to Dates
        const convertTimestamp = (value: unknown): Date => {
          if (value instanceof Timestamp) {
            return value.toDate()
          }
          if (value instanceof Date) {
            return value
          }
          return new Date()
        }

        const game: MultiplayerGame = {
          gameId: data.gameId,
          gameState: data.gameState,
          mode: 'multiplayer',
          p1: data.p1,
          p2: data.p2,
          activePlayer: data.activePlayer,
          status: data.status,
          inviteCode: data.inviteCode,
      roundAcks: data.roundAcks ?? null,
      finalSeen: data.finalSeen ?? null,
      terminalStatus: data.terminalStatus ?? null,
          startedAt: data.startedAt ? convertTimestamp(data.startedAt) : undefined,
          lastUpdated: convertTimestamp(data.lastUpdated),
          createdAt: convertTimestamp(data.createdAt),
        }

        callback(game)
      }
    })
  }

  const validateInviteCode = async (
    inputCode: string,
  ): Promise<{ valid: boolean; error?: string; matchRules?: GameRules }> => {
    const code = formatInviteCode(inputCode)
    const normalizedCode = normalizeInviteCode(inputCode)

    // Basic format validation
    if (normalizedCode.length !== 6) {
      return {
        valid: false,
        error: 'Invalid invite code format. Code should be 6 characters.',
      }
    }

    try {
      // Lookup code in Firestore
      const codeDoc = await getDoc(doc(db, 'invite_codes', code))

      if (!codeDoc.exists()) {
        return {
          valid: false,
          error: 'Invalid invite code. Please check and try again.',
        }
      }

      const inviteData = codeDoc.data() as InviteCode

      // Check if expired
      const expiresAt =
        inviteData.expiresAt instanceof Timestamp
          ? inviteData.expiresAt.toDate()
          : new Date(inviteData.expiresAt)

      if (expiresAt < new Date()) {
        return {
          valid: false,
          error: 'This invite code has expired. Ask your friend for a new one.',
        }
      }

      // Check if already used
      if (inviteData.used) {
        return {
          valid: false,
          error: 'This invite code has already been used.',
        }
      }

      // Verify game exists and is in waiting status
      const gameDoc = await getDoc(doc(db, 'multiplayer_games', inviteData.gameId))
      if (!gameDoc.exists()) {
        return {
          valid: false,
          error: 'Game not found. It may have been cancelled.',
        }
      }

      const gameData = gameDoc.data()
      if (gameData.status !== 'waiting') {
        return {
          valid: false,
          error: 'This game is no longer available to join.',
        }
      }

      if (gameData.p2 && gameData.p2 !== '') {
        return {
          valid: false,
          error: 'This game already has two players.',
        }
      }

      return { valid: true, matchRules: gameData.matchRules as GameRules | undefined }
    } catch (error) {
      console.error('Error validating invite code:', error)
      return {
        valid: false,
        error: 'Unable to validate code. Please check your connection.',
      }
    }
  }

  const listMyGames = async (): Promise<MultiplayerGame[]> => {
    if (!profile.value) {
      return []
    }

    try {
      // Query for games where user is p1
      const q1 = query(collection(db, 'multiplayer_games'), where('p1', '==', profile.value.uid))

      // Query for games where user is p2
      const q2 = query(collection(db, 'multiplayer_games'), where('p2', '==', profile.value.uid))

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)])

      const games: MultiplayerGame[] = []

      const convertTimestamp = (value: unknown): Date => {
        if (value instanceof Timestamp) {
          return value.toDate()
        }
        if (value instanceof Date) {
          return value
        }
        return new Date()
      }

      const processSnapshot = (snapshot: any) => {
        snapshot.forEach((doc: any) => {
          const data = doc.data()
          games.push({
            gameId: data.gameId,
            gameState: data.gameState,
            mode: 'multiplayer',
            p1: data.p1,
            p2: data.p2,
            activePlayer: data.activePlayer,
            status: data.status,
            inviteCode: data.inviteCode,
            startedAt: data.startedAt ? convertTimestamp(data.startedAt) : undefined,
            lastUpdated: convertTimestamp(data.lastUpdated),
            createdAt: convertTimestamp(data.createdAt),
          })
        })
      }

      processSnapshot(snapshot1)
      processSnapshot(snapshot2)

      // Sort by last updated (most recent first)
      games.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())

      return games
    } catch (error) {
      console.error('Error listing games:', error)
      return []
    }
  }

  return {
    createGame,
    joinGame,
    cancelGame,
    checkOpponentJoined,
    subscribeToGame,
    validateInviteCode,
    listMyGames,
    useOpponentPlayer,
    setOpponentPlayer,
  }
}
