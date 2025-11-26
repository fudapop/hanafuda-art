import type { User } from 'firebase/auth'
import { useAvatar } from '~/composables/useAvatar'
import { getDexBeeDb } from '~/composables/useDexBee'
import {
  calculateGameRecord,
  createDefaultProfile,
  generateRandomUsername,
  sanitizeFirestoreData,
  sanitizeProfile,
} from '~/utils/profile'
import type { PlayerStatsKey } from '~/utils/stats'
import { updateStatsWithOps, verifyStatsIntegrity } from '~/utils/stats'
import { resolveConflict as resolveProfileConflict, type ConflictResolution } from '~/utils/sync'
import { useConfigStore, type GameSettings } from '~~/stores/configStore'
import type {
  LocalProfileStore,
  PlayerProfile,
  SyncAdapter,
  SyncMetadata,
  SyncOptions,
  SyncResult,
  SyncStatus,
} from '~~/types/profile'

// In-memory fallback store for tests / environments without IndexedDB
const memoryStores = {
  byId: new Map<string, PlayerProfile>(),
  syncMetaById: new Map<string, SyncMetadata>(),
}

const createMemoryStore = (): LocalProfileStore => {
  return {
    async init() {},
    async get(uid: string) {
      return memoryStores.byId.get(uid) ?? null
    },
    async set(profile: PlayerProfile) {
      memoryStores.byId.set(profile.uid, profile)
    },
    async remove(uid: string) {
      memoryStores.byId.delete(uid)
    },
    async hasAny() {
      return memoryStores.byId.size > 0
    },
    async getSyncMetadata(uid: string) {
      return memoryStores.syncMetaById.get(uid) ?? null
    },
    async setSyncMetadata(uid: string, metadata: SyncMetadata) {
      memoryStores.syncMetaById.set(uid, metadata)
    },
  }
}

// Lazy factory for dexbee-js backed store with graceful fallback
let storeInstance: LocalProfileStore | null = null

async function getStore(): Promise<LocalProfileStore> {
  if (storeInstance) return storeInstance
  try {
    const { eq } = await import('dexbee-js')
    const db = await getDexBeeDb()
    const table = db.table('playerProfiles')
    const metaTable = db.table('syncMetadata')
    storeInstance = {
      async init() {
        // noop, table creation above is sufficient
      },
      async get(uid: string) {
        const result = await table.where(eq('uid', uid)).first()
        return result as PlayerProfile
      },
      async set(profile: PlayerProfile) {
        const existing = await table.where(eq('uid', profile.uid)).first()
        if (existing) {
          await table.update(profile.uid, profile)
        } else {
          await table.insert(profile)
        }
      },
      async remove(uid: string) {
        await table.delete(uid)
      },
      async hasAny() {
        const profiles = await table.all()
        return profiles && profiles.length > 0
      },
      async getSyncMetadata(uid: string) {
        const result = await metaTable.where(eq('uid', uid)).first()
        return result as SyncMetadata | null
      },
      async setSyncMetadata(uid: string, metadata: SyncMetadata) {
        const existing = await metaTable.where(eq('uid', uid)).first()
        // Convert null to undefined for DexBee compatibility
        const dexbeeData = {
          uid,
          lastSyncedAt: metadata.lastSyncedAt ?? undefined,
          lastSyncError: metadata.lastSyncError ?? undefined,
          pendingChanges: metadata.pendingChanges,
          syncVersion: metadata.syncVersion,
        }
        if (existing) {
          await metaTable.update(uid, dexbeeData)
        } else {
          await metaTable.insert(dexbeeData)
        }
      },
    }
  } catch (error) {
    console.error('Failed to initialize DexBee, falling back to memory store:', error)
    storeInstance = createMemoryStore()
  }
  await storeInstance.init()
  return storeInstance
}

/**
 * Check if any local profiles exist in IndexedDB
 * Useful for middleware to determine if offline play is available
 */
export async function hasAnyLocalProfile(): Promise<boolean> {
  try {
    const store = await getStore()
    return await store.hasAny()
  } catch (error) {
    console.warn('Failed to check for local profiles:', error)
    return false
  }
}

/**
 * Delete guest profile from IndexedDB
 * Used when a stale guest profile needs to be removed
 */
export async function deleteGuestProfile(): Promise<void> {
  try {
    const store = await getStore()
    await store.remove('guest_profile')
    console.info('Guest profile deleted from IndexedDB')
  } catch (error) {
    console.error('Failed to delete guest profile:', error)
    throw error
  }
}

/**
 * Create or load guest profile from IndexedDB
 * Uses constant UID 'guest_profile' - one guest per device
 * Guests persist across browser sessions until authentication
 */
export async function createLocalGuestProfile(username?: string): Promise<PlayerProfile> {
  // Use a fresh random avatar for guests to avoid leaking previous auth photo
  const { getRandomAvatarUrl } = useAvatar()
  const store = await getStore()

  // Check if guest profile already exists
  const existingGuest = await store.get('guest_profile')

  if (existingGuest) {
    console.info('Loading existing guest profile')
    return existingGuest
  }

  // Create new guest profile with constant UID
  console.info('Creating new guest profile')
  const guestProfile = await createDefaultProfile(
    {
      uid: 'guest_profile', // Constant UID, not random
      email: '',
      username: username || generateRandomUsername(),
      record: { coins: 0, win: 0, draw: 0, loss: 0 }, // Guests start with 0 coins
      isGuest: true,
    },
    getRandomAvatarUrl((a) => !a.includes('gamblers')),
  )

  // Save to IndexedDB (not sessionStorage)
  await store.set(guestProfile)

  return guestProfile
}

export const usePlayerProfile = () => {
  // Use same state keys as original useProfile for compatibility
  // Note: useState persists across navigation in Nuxt
  const useWatcher = (): Ref<any> => useState('watcher', () => null)
  const useUserProfile = (): Ref<PlayerProfile | null> => useState('profile', () => null)

  const profile = useUserProfile()
  const watcher = useWatcher()

  const { p1Avatar } = useAvatar()

  // Queue to prevent race conditions when multiple updates happen quickly
  let updateQueue = Promise.resolve()

  const queueUpdate = async <T>(updateFn: () => Promise<T>): Promise<T> => {
    const result = updateQueue.then(updateFn).catch((error) => {
      console.error('Profile update error:', error)
      throw error
    })
    updateQueue = result.then(() => {}) // Continue chain even if result is used
    return result
  }

  // Sync state management
  const useSyncStatus = (): Ref<SyncStatus> => useState('sync-status', () => 'idle')
  const useSyncAdapter = (): Ref<SyncAdapter | null> => useState('sync-adapter', () => null)
  const useSyncOptions = (): Ref<SyncOptions> =>
    useState('sync-options', () => ({
      autoSync: true,
      debounceMs: 1000,
      maxRetries: 3,
      realtimeSync: false,
      conflictStrategy: 'last-write-wins' as const,
    }))

  const syncStatus = useSyncStatus()
  const syncAdapter = useSyncAdapter()
  const syncOptions = useSyncOptions()

  // Debounced sync queue
  let syncTimeoutId: ReturnType<typeof setTimeout> | null = null
  let pendingSyncPromise: Promise<SyncResult> | null = null

  // Flag to prevent watcher from triggering during sync (prevents re-entry)
  let isSyncing = false

  // Flag to prevent watcher from triggering during transfer (prevents race conditions)
  let isTransferring = false

  // Flag to prevent watcher recreation after explicit cleanup
  const useWatcherDisabled = (): Ref<boolean> => useState('watcher-disabled', () => false)
  const watcherDisabled = useWatcherDisabled()

  const setLocalData = async () => {
    if (!profile.value) return
    const store = await getStore()
    const sanitized = sanitizeProfile(profile.value)
    await store.set(sanitized)
  }

  const getLocalData = async (uid: string): Promise<PlayerProfile | null> => {
    const store = await getStore()
    return await store.get(uid)
  }

  const hasLocalProfile = async (uid: string): Promise<boolean> => {
    const store = await getStore()
    const profile = await store.get(uid)
    return profile !== null
  }

  const deleteLocalData = async (uid: string) => {
    const store = await getStore()
    await store.remove(uid)
  }

  const loadProfile = async (user: User) => {
    // Re-enable watcher when loading a new profile
    if (watcherDisabled.value) {
      watcherDisabled.value = false
    }

    const local = await getLocalData(user.uid)
    if (local) {
      await loadUserData(user, local)
    } else {
      createNewProfile(user)
    }
  }

  const loadUserData = async (user: User, userData: PlayerProfile) => {
    profile.value = await createDefaultProfile(
      {
        ...userData,
        uid: user.uid,
        avatar: userData.avatar || (user as any).photoURL,
        username:
          userData.username || (user as any).displayName?.split(' ')[0] || generateRandomUsername(),
        lastUpdated: userData.lastUpdated ? new Date(userData.lastUpdated) : new Date(),
      },
      p1Avatar.value,
    )

    if (profile.value?.settings) {
      const config = useConfigStore()
      config.loadUserSettings(profile.value.settings as unknown as GameSettings)
    }
  }

  const createNewProfile = async (user: User) => {
    profile.value = await createDefaultProfile(
      {
        uid: user.uid,
        avatar: (user as any).photoURL,
        username: (user as any).displayName?.split(' ')[0] || `User #${user.uid.slice(0, 5)}`,
      },
      p1Avatar.value,
    )

    // Load settings into configStore
    if (profile.value?.settings) {
      const config = useConfigStore()
      config.loadUserSettings(profile.value.settings as unknown as GameSettings)
    }

    void setLocalData()
  }

  /**
   * Transfer/merge guest profile to authenticated profile
   * - If no auth profile exists: creates new auth profile from guest + signup bonus
   * - If auth profile exists: merges guest data into existing auth profile
   * - Always deletes guest profile after successful transfer
   * @param user - Firebase authenticated user
   * @param remoteProfile - Optional remote profile from Firestore to merge with
   * @returns The authenticated profile (new or merged)
   */
  const transferGuestProfile = async (
    user: User,
    remoteProfile?: PlayerProfile,
  ): Promise<PlayerProfile> => {
    // Disable watcher during transfer to prevent race conditions
    isTransferring = true

    try {
      const store = await getStore()
      const guestProfile = await store.get('guest_profile')

      if (!guestProfile) {
        console.info('No guest profile to transfer, creating new authenticated profile')

        if (remoteProfile) {
          // Use existing remote profile
          console.info('Loading existing remote profile')
          await store.set(sanitizeProfile(remoteProfile))
          profile.value = remoteProfile
          return remoteProfile
        } else {
          // No guest and no remote, create fresh authenticated profile
          const newProfile = await createDefaultProfile(
            {
              uid: user.uid,
              email: (user as any).email || '',
              avatar: (user as any).photoURL || p1Avatar.value,
              username: (user as any).displayName?.split(' ')[0] || generateRandomUsername(),
            },
            p1Avatar.value,
          )
          await store.set(sanitizeProfile(newProfile))
          profile.value = newProfile
          return newProfile
        }
      }

      // Check if authenticated profile already exists (in IndexedDB or passed as parameter)
      const existingAuthProfile = remoteProfile || (await store.get(user.uid))

      if (existingAuthProfile) {
        // Auth profile exists - merge guest data into it
        console.info('Merging guest profile into existing authenticated profile', {
          guestRecord: guestProfile.record,
          authRecord: existingAuthProfile.record,
        })

        // Merge stats properly using the utility function
        const { mergePlayerStats } = await import('~/utils/stats')
        const mergedStats = await mergePlayerStats(guestProfile.stats, existingAuthProfile.stats)

        const mergedProfile: PlayerProfile = {
          ...existingAuthProfile,
          // Merge game records by adding them together
          record: {
            win: guestProfile.record.win + existingAuthProfile.record.win,
            loss: guestProfile.record.loss + existingAuthProfile.record.loss,
            draw: guestProfile.record.draw + existingAuthProfile.record.draw,
            coins: guestProfile.record.coins + existingAuthProfile.record.coins,
          },
          // Merge stats using dedicated helper function
          stats: mergedStats,
          // Update flags
          flags: {
            ...existingAuthProfile.flags,
            isNewPlayer: false, // They've played before
          },
          lastUpdated: new Date(),
        }

        // Save merged profile first to prevent data loss
        try {
          await store.set(sanitizeProfile(mergedProfile))
          // Safely remove guest profile after successful save
          await store.remove('guest_profile')
          // Update in-memory profile (watcher is disabled, won't trigger save)
          profile.value = mergedProfile

          console.info('Guest profile merged successfully', {
            newRecord: mergedProfile.record,
          })

          return mergedProfile
        } catch (error) {
          console.error('Failed to save merged profile:', error)
          throw error
        }
      } else {
        // No auth profile exists - create new one from guest
        console.info('Creating authenticated profile from guest', {
          guestRecord: guestProfile.record,
          guestStats: guestProfile.stats,
        })

        const username = guestProfile.username || generateRandomUsername()

        // Transfer by updating UID and auth fields
        const authenticatedProfile: PlayerProfile = {
          ...guestProfile,
          uid: user.uid, // New UID
          email: (user as any).email || '',
          avatar: (user as any).photoURL || guestProfile.avatar,
          username: guestProfile.username || generateRandomUsername(),
          isGuest: undefined, // No longer a guest
          record: {
            ...guestProfile.record,
            coins: guestProfile.record.coins + 500, // Signup bonus
          },
          flags: {
            ...guestProfile.flags,
            isNewPlayer: false, // They've already played
          },
          lastUpdated: new Date(),
        }

        // Save authenticated profile first to prevent data loss
        try {
          await store.set(sanitizeProfile(authenticatedProfile))
          // Safely remove guest profile after successful save
          await store.remove('guest_profile')
          // Update in-memory profile (watcher is disabled, won't trigger save)
          profile.value = authenticatedProfile

          console.info('Guest profile transferred successfully', {
            newRecord: authenticatedProfile.record,
          })

          return authenticatedProfile
        } catch (error) {
          console.error('Failed to save authenticated profile:', error)
          throw error
        }
      }
    } finally {
      // Always re-enable watcher after transfer completes
      isTransferring = false
    }
  }

  /**
   * Migrate data from Firestore (old useProfile) to IndexedDB
   * This is optional and only needed for users with existing Firestore data
   * Handles Firestore-specific data types (Timestamps) and sanitizes for IndexedDB
   */
  const migrateFromFirestore = async (user: User) => {
    try {
      const { doc, getDoc, getFirestore } = await import('firebase/firestore')
      const docRef = await getDoc(doc(getFirestore(), 'users', `u_${user.uid}`))
      if (docRef.exists()) {
        const rawData = docRef.data()

        // Sanitize Firestore data for IndexedDB using utility function
        const sanitizedData = await sanitizeFirestoreData(
          rawData,
          user.uid,
          (user as any).photoURL || p1Avatar.value,
        )

        loadUserData(user, sanitizedData)
        await setLocalData()
      }
    } catch (error) {
      // Do nothing if migration fails except warning
      console.warn('Failed to migrate from Firestore:', error)
    }
  }

  const getProfile = async (user: User) => {
    const sameUser = profile.value && profile.value.uid === user.uid
    if (profile.value && sameUser) return profile.value
    await loadProfile(user)
    return profile.value
  }

  const updateProfile = async (data: Partial<PlayerProfile>) => {
    if (!profile.value) return

    // Verify stats integrity before updating if stats are being modified
    if (data.stats && !(await verifyStatsIntegrity(profile.value.stats))) {
      // Stats have been tampered with, do not update
      return
    }

    profile.value = {
      ...(profile.value as PlayerProfile),
      ...(data as PlayerProfile),
      lastUpdated: new Date(),
    }

    // Save to IndexedDB (both guest and authenticated profiles)
    await setLocalData()
  }

  const resetLocal = async (uid?: string) => {
    const userId = uid || profile.value?.uid

    if (!userId) {
      return
    }

    // Clear any pending sync timeouts first
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId)
      syncTimeoutId = null
    }

    // Stop watcher to prevent re-saving during cleanup
    if (watcher.value) {
      watcher.value()
      watcher.value = null
    }

    // Disable watcher to prevent recreation
    watcherDisabled.value = true

    // Clear in-memory state
    profile.value = null as any

    // Clear all storage locations
    try {
      await deleteLocalData(userId)
    } catch (error) {
      // Continue with cleanup even if IndexedDB fails
    }
  }

  /**
   * Load a local guest profile into the current state
   * Used when creating purely local guest profiles without Firebase
   */
  const loadLocalGuestProfile = async (guestProfile: PlayerProfile) => {
    // Re-enable watcher when loading a guest profile
    if (watcherDisabled.value) {
      watcherDisabled.value = false
    }

    // Use createDefaultProfile to ensure stats are validated
    profile.value = await createDefaultProfile(guestProfile, p1Avatar.value)

    // Load settings into configStore
    if (profile.value?.settings) {
      const config = useConfigStore()
      config.loadUserSettings(profile.value.settings as unknown as GameSettings)
    }
  }

  /**
   * Update game record with results (win/loss/draw and coins)
   * This properly mutates the profile and persists the changes
   */
  const updateGameRecord = async (result: 'win' | 'loss' | 'draw', coinsEarned: number) => {
    if (!profile.value) return

    const newRecord = calculateGameRecord(profile.value.record, result, coinsEarned)

    // Persist the changes
    await updateProfile({ record: newRecord })
  }

  const updatePlayerStats = async (
    operations: Array<{
      key: PlayerStatsKey
      op: 'increment' | 'decrement' | 'set'
      value: number
    }>,
  ) => {
    return queueUpdate(async () => {
      if (!profile.value) {
        return
      }

      const newStats = await updateStatsWithOps(profile.value.stats, operations)

      await updateProfile({ stats: newStats })
    })
  }

  /**
   * Resolve conflict between local and remote profiles
   * Delegates to pure utility function for easy testing
   */
  const resolveConflict = async (
    local: PlayerProfile,
    remote: PlayerProfile,
  ): Promise<ConflictResolution> => {
    // Use adapter's resolve method if provided
    if (syncAdapter.value?.resolve) {
      // Adapter's resolve returns PlayerProfile, wrap it in ConflictResolution
      // We assume it's merged since we don't know the source
      const resolved = await syncAdapter.value.resolve(local, remote)
      return { resolved, source: 'merged' }
    }

    // Use pure utility function with configured strategy
    const strategy = syncOptions.value.conflictStrategy
    if (strategy === 'manual') {
      // For future: trigger UI for manual resolution
      // For now, fallback to LWW
      return await resolveProfileConflict(local, remote, 'last-write-wins')
    }

    return await resolveProfileConflict(local, remote, strategy)
  }

  /**
   * Pull remote profile and merge with local
   */
  const syncPull = async (): Promise<SyncResult> => {
    if (!syncAdapter.value || !profile.value) {
      return {
        success: false,
        error: 'No adapter or profile',
        local: null,
        remote: null,
        action: 'skipped',
      }
    }

    // Concurrency guard - return early if sync is already in progress
    if (pendingSyncPromise) {
      return {
        success: false,
        error: 'Sync already in progress',
        local: null,
        remote: null,
        action: 'skipped',
      }
    }

    const store = await getStore()
    const uid = profile.value.uid

    syncStatus.value = 'pulling'

    // Set the pending promise to prevent concurrent syncs
    pendingSyncPromise = (async () => {
      // Set syncing flag to prevent watcher re-entry
      isSyncing = true

      try {
        // Check if adapter is available (already checked above, but TypeScript needs this)
        const adapter = syncAdapter.value
        if (!adapter) {
          syncStatus.value = 'idle'
          return {
            success: false,
            error: 'No adapter',
            local: profile.value,
            remote: null,
            action: 'skipped',
          }
        }

        if (!(await adapter.isAvailable())) {
          syncStatus.value = 'idle'
          return {
            success: false,
            error: 'Adapter unavailable',
            local: profile.value,
            remote: null,
            action: 'skipped',
          }
        }

        // Pull from remote
        const remote = await adapter.pull(uid)

        if (!remote) {
          // No remote profile - this is fine for first sync
          syncStatus.value = 'idle'
          return { success: true, local: profile.value, remote: null, action: 'skipped' }
        }

        // Get local profile
        const local = await store.get(uid)

        if (!local) {
          // No local profile - use remote
          await loadUserData({ uid } as any, remote)
          await setLocalData() // Use setLocalData to properly sanitize before saving
          await store.setSyncMetadata(uid, {
            lastSyncedAt: new Date(),
            lastSyncError: null,
            pendingChanges: false,
            syncVersion: 1,
          })
          syncStatus.value = 'idle'
          return { success: true, local: profile.value, remote, action: 'pulled' }
        }

        // Resolve conflict
        const { resolved: merged, source } = await resolveConflict(local, remote)

        if (source !== 'local') {
          // Remote was newer or merge occurred
          await loadUserData({ uid } as any, merged)
          await setLocalData() // Use setLocalData to properly sanitize before saving

          // Read metadata once to get current syncVersion
          const currentMeta = await store.getSyncMetadata(uid)
          await store.setSyncMetadata(uid, {
            lastSyncedAt: new Date(),
            lastSyncError: null,
            pendingChanges: false,
            syncVersion: (currentMeta?.syncVersion ?? 0) + 1,
          })
          syncStatus.value = 'idle'
          return { success: true, local, remote, merged, action: 'merged' }
        }

        // Local was up-to-date
        syncStatus.value = 'idle'
        return { success: true, local, remote, action: 'skipped' }
      } catch (error: any) {
        console.error('Sync pull error:', error)
        // Read metadata once before updating
        const currentMeta = await store.getSyncMetadata(uid)
        await store.setSyncMetadata(uid, {
          lastSyncedAt: currentMeta?.lastSyncedAt ?? null,
          lastSyncError: error.message,
          pendingChanges: true,
          syncVersion: currentMeta?.syncVersion ?? 0,
        })
        syncStatus.value = 'error'
        return {
          success: false,
          error: error.message,
          local: profile.value,
          remote: null,
          action: 'skipped',
        }
      } finally {
        isSyncing = false
        pendingSyncPromise = null
      }
    })()

    return await pendingSyncPromise
  }

  /**
   * Push local profile to remote
   */
  const syncPush = async (): Promise<SyncResult> => {
    if (!syncAdapter.value || !profile.value) {
      return {
        success: false,
        error: 'No adapter or profile',
        local: null,
        remote: null,
        action: 'skipped',
      }
    }

    const store = await getStore()
    const uid = profile.value.uid

    // Skip guest profiles
    if (profile.value.isGuest) {
      return {
        success: false,
        error: 'Guest profiles not synced',
        local: profile.value,
        remote: null,
        action: 'skipped',
      }
    }

    syncStatus.value = 'pushing'

    try {
      // Read metadata once at the start to avoid non-atomic reads
      const currentMeta = await store.getSyncMetadata(uid)

      // Check if adapter is available
      if (!(await syncAdapter.value.isAvailable())) {
        // Mark as pending for next sync attempt
        await store.setSyncMetadata(uid, {
          lastSyncedAt: currentMeta?.lastSyncedAt ?? null,
          lastSyncError: 'Network unavailable',
          pendingChanges: true,
          syncVersion: currentMeta?.syncVersion ?? 0,
        })
        syncStatus.value = 'idle'
        return {
          success: false,
          error: 'Adapter unavailable',
          local: profile.value,
          remote: null,
          action: 'skipped',
        }
      }

      // Push to remote
      const success = await syncAdapter.value.push(sanitizeProfile(profile.value))

      if (success) {
        // Refresh metadata before incrementing
        const updatedMeta = await store.getSyncMetadata(uid)
        await store.setSyncMetadata(uid, {
          lastSyncedAt: new Date(),
          lastSyncError: null,
          pendingChanges: false,
          syncVersion: (updatedMeta?.syncVersion ?? 0) + 1,
        })
        syncStatus.value = 'idle'
        return { success: true, local: profile.value, remote: profile.value, action: 'pushed' }
      } else {
        throw new Error('Push operation failed')
      }
    } catch (error: any) {
      console.error('Sync push error:', error)
      // Read metadata once before updating
      const errorMeta = await store.getSyncMetadata(uid)
      await store.setSyncMetadata(uid, {
        lastSyncedAt: errorMeta?.lastSyncedAt ?? null,
        lastSyncError: error.message,
        pendingChanges: true,
        syncVersion: errorMeta?.syncVersion ?? 0,
      })
      syncStatus.value = 'error'
      return {
        success: false,
        error: error.message,
        local: profile.value,
        remote: null,
        action: 'skipped',
      }
    }
  }

  /**
   * Full bidirectional sync (pull + merge + push if needed)
   */
  const syncBidirectional = async (): Promise<SyncResult> => {
    if (!syncAdapter.value || !profile.value) {
      return {
        success: false,
        error: 'No adapter or profile',
        local: null,
        remote: null,
        action: 'skipped',
      }
    }

    // Concurrency guard and watcher disable
    if (pendingSyncPromise) {
      return {
        success: false,
        error: 'Sync already in progress',
        local: null,
        remote: null,
        action: 'skipped',
      }
    }

    // Set syncing flag to prevent watcher from triggering during entire sync
    isSyncing = true

    syncStatus.value = 'syncing'

    try {
      // Capture uid at start to avoid TOCTOU issues
      const uid = profile.value.uid

      // Pull first
      const pullResult = await syncPull()

      if (!pullResult.success) {
        return pullResult
      }

      // Re-check for changes after pull (fresh metadata read)
      const store = await getStore()
      const metadata = await store.getSyncMetadata(uid)

      if (metadata?.pendingChanges || pullResult.action === 'merged') {
        // Push merged or pending changes
        const pushResult = await syncPush()
        return pushResult
      }

      syncStatus.value = 'idle'
      return pullResult
    } catch (error: any) {
      console.error('Bidirectional sync error:', error)
      syncStatus.value = 'error'
      return {
        success: false,
        error: error.message,
        local: profile.value,
        remote: null,
        action: 'skipped',
      }
    } finally {
      isSyncing = false
    }
  }

  /**
   * Debounced sync trigger for auto-sync
   */
  const triggerAutoSync = () => {
    if (!syncOptions.value.autoSync || !syncAdapter.value || profile.value?.isGuest) {
      return
    }

    // Clear existing timeout
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId)
    }

    // Set new timeout
    syncTimeoutId = setTimeout(() => {
      if (syncStatus.value === 'idle') {
        pendingSyncPromise = syncPush()
      }
    }, syncOptions.value.debounceMs)
  }

  const current = computed(() => profile.value)

  // Only create watcher if not explicitly disabled (e.g., after logout)
  if (!watcher.value && !watcherDisabled.value) {
    watcher.value = watch(
      current,
      () => {
        if (!current.value) {
          watcher.value?.()
          watcher.value = null
          return
        }

        // Skip watcher if sync or transfer is in progress (prevents re-entry race condition)
        if (isSyncing || isTransferring) {
          return
        }

        // Save to IndexedDB (both guest and authenticated profiles)
        void setLocalData()

        // Trigger auto-sync if enabled (only for authenticated users)
        if (!current.value.isGuest) {
          triggerAutoSync()
        }
      },
      { deep: true },
    )
  }

  return {
    current,
    getProfile,
    updateProfile,
    transferGuestProfile,
    resetLocal,
    migrateFromFirestore,
    hasLocalProfile,
    getLocalData,
    loadLocalGuestProfile,
    updateGameRecord,
    updatePlayerStats,

    // Sync API
    syncStatus: computed(() => syncStatus.value),
    syncAdapter: computed(() => syncAdapter.value),
    syncOptions: computed(() => syncOptions.value),

    /**
     * Register a sync adapter for remote storage
     */
    setSyncAdapter(adapter: SyncAdapter, options?: Partial<SyncOptions>) {
      syncAdapter.value = adapter
      if (options) {
        syncOptions.value = { ...syncOptions.value, ...options }
      }
      console.info(`Sync adapter registered: ${adapter.name}`)
    },

    /**
     * Manually trigger pull sync
     */
    syncPull,

    /**
     * Manually trigger push sync
     */
    syncPush,

    /**
     * Manually trigger full bidirectional sync
     */
    sync: syncBidirectional,

    /**
     * Get sync metadata for current profile
     */
    async getSyncMetadata() {
      if (!profile.value) return null
      const store = await getStore()
      return await store.getSyncMetadata(profile.value.uid)
    },

    /**
     * Configure sync options
     */
    configureSyncOptions(options: Partial<SyncOptions>) {
      syncOptions.value = { ...syncOptions.value, ...options }
    },
  }
}
