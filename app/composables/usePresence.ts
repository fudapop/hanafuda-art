/**
 * @fileoverview Presence Tracking Composable using Firebase Realtime Database
 *
 * Provides real-time presence tracking for multiplayer games using RTDB's
 * onDisconnect() feature for reliable disconnect detection. This approach
 * automatically detects client crashes and network failures.
 */

import {
  get,
  getDatabase,
  onDisconnect,
  onValue,
  ref as dbRef,
  serverTimestamp,
  set,
  type Database,
  type Unsubscribe,
  update,
} from 'firebase/database'
import type { PresenceState } from '~~/types/profile'

export type PresenceComposable = {
  /**
   * Initialize presence tracking for the current user
   * Sets up connection monitoring and onDisconnect handlers
   */
  initializePresence: (gameId: string) => Promise<void>

  /**
   * Subscribe to opponent's presence updates
   * Returns unsubscribe function
   */
  subscribeToOpponentPresence: (opponentUid: string) => Unsubscribe | null

  /**
   * Update current user's status (online/playing)
   * Use 'playing' when it's the user's turn
   */
  setMyStatus: (status: 'online' | 'playing') => Promise<void>

  /**
   * Set a message that will be displayed to the opponent
   * Used when leaving a multiplayer game
   */
  setMessage: (message: string | null) => Promise<void>

  /**
   * Cleanup presence tracking
   * Marks user offline and unsubscribes from all listeners
   */
  cleanup: () => Promise<void>

  /**
   * Opponent's current presence state
   */
  opponentPresence: Readonly<Ref<PresenceState>>

  /**
   * Computed: Is opponent currently online?
   */
  isOpponentOnline: Readonly<Ref<boolean>>

  /**
   * Computed: Is opponent currently playing (taking their turn)?
   */
  isOpponentPlaying: Readonly<Ref<boolean>>

  /**
   * Computed: Is opponent disconnected (offline state)?
   */
  isOpponentDisconnected: Readonly<Ref<boolean>>

  /**
   * Format last seen timestamp as human-readable string
   */
  formatLastSeen: (lastSeen: Date) => string

  /**
   * Get duration in milliseconds since opponent went offline
   * Returns 0 if opponent is online or lastSeen is unavailable
   */
  getOfflineDuration: () => number

  /**
   * Format offline duration as human-readable string
   * Returns null if opponent is online
   */
  formatOfflineDuration: () => string | null
}

export const usePresence = (): PresenceComposable => {
  const { current: currentProfile } = useProfile()

  let rtdb: Database | null = null

  // Use global state for presence (shared across all components)
  const opponentPresence = useState<PresenceState>('opponent-presence', () => ({
    uid: '',
    state: 'unknown',
    lastSeen: null,
    currentGameId: null,
  }))

  const connectedUnsubscribe = ref<Unsubscribe | null>(null)
  const opponentUnsubscribe = ref<Unsubscribe | null>(null)
  const keepaliveUnsubscribe = ref<Unsubscribe | null>(null)
  const currentGameId = ref<string | null>(null)

  const isOpponentOnline = computed(() => opponentPresence.value.state === 'online')
  const isOpponentPlaying = computed(() => opponentPresence.value.state === 'playing')
  const isOpponentDisconnected = computed(() => opponentPresence.value.state === 'offline')

  /**
   * Get duration in milliseconds since opponent went offline
   * Returns 0 if opponent is online or lastSeen is unavailable
   */
  const getOfflineDuration = (): number => {
    const presence = opponentPresence.value
    if (presence.state !== 'offline' || !presence.lastSeen) {
      return 0
    }
    return Date.now() - presence.lastSeen.getTime()
  }

  /**
   * Format offline duration as human-readable string
   * Returns null if opponent is online
   */
  const formatOfflineDuration = (): string | null => {
    const presence = opponentPresence.value
    if (presence.state !== 'offline') {
      return null
    }

    const durationMs = getOfflineDuration()
    if (durationMs === 0) return 'just now'

    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `${seconds}s`
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    return `${hours}h ${minutes % 60}m`
  }

  /**
   * Initialize RTDB instance (lazy)
   */
  const initRTDB = (): Database => {
    if (!rtdb) {
      rtdb = getDatabase()
    }
    return rtdb
  }

  /**
   * Initialize presence tracking for current user
   */
  const initializePresence = async (gameId: string): Promise<void> => {
    const uid = currentProfile.value?.uid
    if (!uid) {
      console.warn('Cannot initialize presence: user not authenticated')
      return
    }

    currentGameId.value = gameId
    const db = initRTDB()
    const userStatusRef = dbRef(db, `presence/${uid}`)
    const connectedRef = dbRef(db, '.info/connected')

    // Monitor connection status
    connectedUnsubscribe.value = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        console.debug('[Presence] Connected to RTDB')

        // CRITICAL: Set onDisconnect FIRST (server acknowledges immediately)
        // This ensures the offline handler is registered before we go online
        onDisconnect(userStatusRef)
          .set({
            state: 'offline',
            lastSeen: serverTimestamp(),
            currentGameId: null,
          })
          .then(() => {
            console.debug('[Presence] onDisconnect handler registered')
          })
          .catch((error) => {
            console.error('[Presence] Failed to set onDisconnect handler:', error)
          })

        // Then mark as online
        set(userStatusRef, {
          state: 'online',
          lastSeen: serverTimestamp(),
          currentGameId: gameId,
        }).catch((error) => {
          console.error('[Presence] Failed to set online status:', error)
        })
      } else {
        console.debug('[Presence] Disconnected from RTDB')
      }
    })

    // Keepalive for Android - prevents 60s disconnect
    // This empty listener keeps the connection active
    const keepaliveRef = dbRef(db, '.info/connected')
    keepaliveUnsubscribe.value = onValue(keepaliveRef, () => {
      // Intentionally empty - just keeps connection alive
    })

    console.info(`[Presence] Initialized for user ${uid} in game ${gameId}`)
  }

  /**
   * Subscribe to opponent's presence updates
   */
  const subscribeToOpponentPresence = (opponentUid: string): Unsubscribe | null => {
    if (!opponentUid) {
      console.warn('Cannot subscribe to opponent presence: invalid uid')
      return null
    }

    const db = initRTDB()
    const opponentRef = dbRef(db, `presence/${opponentUid}`)

    opponentUnsubscribe.value = onValue(opponentRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()

        // Convert RTDB timestamp (number) to Date
        const lastSeen = data.lastSeen ? new Date(data.lastSeen) : null

        opponentPresence.value = {
          uid: opponentUid,
          state: data.state || 'unknown',
          lastSeen: lastSeen,
          currentGameId: data.currentGameId || null,
          message: data.message || null,
        }

        console.debug('[Presence] Opponent status updated:', opponentPresence.value)
      } else {
        // No presence data for opponent yet
        opponentPresence.value = {
          uid: opponentUid,
          state: 'unknown',
          lastSeen: null,
          currentGameId: null,
          message: null,
        }

        console.debug('[Presence] No presence data for opponent')
      }
    })

    console.info(`[Presence] Subscribed to opponent ${opponentUid}`)
    return opponentUnsubscribe.value
  }

  /**
   * Update current user's status
   */
  const setMyStatus = async (status: 'online' | 'playing'): Promise<void> => {
    const uid = currentProfile.value?.uid
    if (!uid) {
      console.warn('[Presence] Cannot set status: user not authenticated')
      return
    }

    const db = initRTDB()
    const userStatusRef = dbRef(db, `presence/${uid}`)

    try {
      await update(userStatusRef, {
        state: status,
        lastSeen: serverTimestamp(),
        currentGameId: currentGameId.value,
      })
      console.debug(`[Presence] Status updated to: ${status}`)
    } catch (error) {
      console.error('[Presence] Failed to update status:', error)
    }
  }

  /**
   * Set a message that will be displayed to the opponent
   * Used when leaving a multiplayer game
   */
  const setMessage = async (message: string | null): Promise<void> => {
    const uid = currentProfile.value?.uid
    if (!uid) {
      console.warn('[Presence] Cannot set message: user not authenticated')
      return
    }

    const db = initRTDB()
    const userStatusRef = dbRef(db, `presence/${uid}`)

    try {
      // Get current presence data to preserve state
      const snapshot = await get(userStatusRef)
      const currentData = snapshot.exists() ? snapshot.val() : {}

      await set(userStatusRef, {
        ...currentData,
        message: message || null,
        lastSeen: serverTimestamp(),
      })
      console.debug(`[Presence] Message updated: ${message || 'cleared'}`)
    } catch (error) {
      console.error('[Presence] Failed to set message:', error)
    }
  }

  /**
   * Format last seen timestamp as human-readable string
   */
  const formatLastSeen = (lastSeen: Date): string => {
    if (!lastSeen) return 'Never'

    const now = new Date()
    const diffMs = now.getTime() - lastSeen.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes === 1) return '1 minute ago'
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  /**
   * Cleanup presence tracking
   */
  const cleanup = async (): Promise<void> => {
    const uid = currentProfile.value?.uid

    // Unsubscribe from connection monitoring
    if (connectedUnsubscribe.value) {
      connectedUnsubscribe.value()
      connectedUnsubscribe.value = null
      console.debug('[Presence] Unsubscribed from connection monitoring')
    }

    // Unsubscribe from opponent presence
    if (opponentUnsubscribe.value) {
      opponentUnsubscribe.value()
      opponentUnsubscribe.value = null
      console.debug('[Presence] Unsubscribed from opponent presence')
    }

    // Unsubscribe from keepalive listener
    if (keepaliveUnsubscribe.value) {
      keepaliveUnsubscribe.value()
      keepaliveUnsubscribe.value = null
      console.debug('[Presence] Unsubscribed from keepalive listener')
    }

    // Mark user offline (will also auto-trigger on disconnect via onDisconnect)
    if (uid && rtdb) {
      const userStatusRef = dbRef(rtdb, `presence/${uid}`)
      try {
        await set(userStatusRef, {
          state: 'offline',
          lastSeen: serverTimestamp(),
          currentGameId: null,
        })
        console.info('[Presence] Marked user offline')
      } catch (error) {
        console.error('[Presence] Failed to mark offline:', error)
      }
    }

    // Reset state
    currentGameId.value = null
    opponentPresence.value = {
      uid: '',
      state: 'unknown',
      lastSeen: null,
      currentGameId: null,
      message: null,
    }
  }

  return {
    initializePresence,
    subscribeToOpponentPresence,
    setMyStatus,
    setMessage,
    cleanup,
    opponentPresence: readonly(opponentPresence),
    isOpponentOnline: readonly(isOpponentOnline),
    isOpponentPlaying: readonly(isOpponentPlaying),
    isOpponentDisconnected: readonly(isOpponentDisconnected),
    formatLastSeen,
    getOfflineDuration,
    formatOfflineDuration,
  }
}
