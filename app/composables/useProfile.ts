import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useFirestoreSyncAdapter } from './adapters/useFirestoreSyncAdapter'
import { usePlayerProfile } from './usePlayerProfile'

/**
 * Auth-aware wrapper around usePlayerProfile with sync
 * Adds automatic profile cleanup on logout and bidirectional Firestore sync
 */
export const useProfile = () => {
  const playerProfile = usePlayerProfile()

  // Initialize Firestore sync adapter
  const initializeSync = () => {
    if (!playerProfile.syncAdapter.value) {
      const adapter = useFirestoreSyncAdapter()
      playerProfile.setSyncAdapter(adapter, {
        autoSync: true,
        debounceMs: 1000,
        maxRetries: 3,
        realtimeSync: false, // Can enable for live updates
        conflictStrategy: 'last-write-wins',
      })
    }
  }

  /**
   * Transfers guest profile to authenticated profile.
   * Pulls remote profile, transfers guest data, syncs back, and handles errors.
   */
  const transferGuestToAuthProfile = async (user: any) => {
    let transferSucceeded = false
    let pullFailed = false
    try {
      // Step 1: Pull remote profile if it exists
      let remoteProfile = null
      try {
        initializeSync()
        const adapter = playerProfile.syncAdapter.value
        if (adapter) {
          remoteProfile = await adapter.pull(user.uid)
        }

        if (remoteProfile) {
          console.info('Found existing authenticated profile in Firestore', {
            remoteCoins: remoteProfile.record.coins,
          })
        } else {
          console.info('No remote profile found - first time login or new user')
        }
      } catch (pullError: any) {
        console.error('Failed to fetch remote profile:', pullError)
        pullFailed = true

        // CRITICAL: Don't proceed with guest transfer if we couldn't verify remote state
        // This prevents overwriting existing remote profiles with guest data
        if (import.meta.client) {
          try {
            const { toast } = await import('vue-sonner')
            toast.error(
              'Failed to fetch your profile. Please check your connection and try again.',
              {
                duration: 5000,
              },
            )
          } catch (toastError) {
            console.warn('Failed to show toast notification:', toastError)
          }
        }

        // Try to load profile normally without transferring guest data
        await playerProfile.getProfile(user)
        return
      }

      // Step 2: Transfer/merge guest profile ONLY if we successfully checked remote
      if (!pullFailed) {
        // Pass remote profile so it merges with it (if exists)
        // If no remote profile, it creates new from guest + signup bonus
        await playerProfile.transferGuestProfile(user, remoteProfile || undefined)
        transferSucceeded = true
        console.info('Guest profile transferred successfully')

        // Step 3: Push final merged profile back to remote
        try {
          await playerProfile.syncPush()
          console.info('Merged profile synced to remote')
        } catch (syncError) {
          console.warn('Failed to sync merged profile to remote:', syncError)
          // Continue with local profile - allows offline play
          // Local transfer already succeeded, no recovery needed
        }

        // Step 4: Sync game saves (transfer guest saves to authenticated account)
        try {
          const { useStoreManager } = await import('~/composables/useStoreManager')
          const storeManager = useStoreManager()
          storeManager.initializeSync()
          // Transfer guest saves to authenticated account and push to remote
          await storeManager.syncPush(user.uid, true)
          console.info('Game saves transferred and synced after guest transfer')
        } catch (saveSyncError) {
          console.warn('Failed to sync game saves after guest transfer:', saveSyncError)
          // Non-critical - saves will sync on next save operation
        }

        // Step 5: Show success notification
        if (import.meta.client) {
          try {
            await nextTick()
            const { toast } = await import('vue-sonner')
            toast.success('Progress saved successfully!', { duration: 3000 })
          } catch (toastError) {
            console.warn('Failed to show toast notification:', toastError)
          }
        }
      }
    } catch (error) {
      console.error('Guest profile transfer failed:', error)
      // Only reload profile if transfer actually failed
      if (!transferSucceeded) {
        await playerProfile.getProfile(user)
        await playerProfile.syncPull()
      }
    }
  }

  // Set up auth state watcher for cleanup on logout
  const useAuthWatcher = (): Ref<any> => useState('auth-watcher', () => null)
  const authWatcher = useAuthWatcher()

  // Track if we just logged out to prevent immediate guest creation
  const useLogoutFlag = (): Ref<boolean> => useState('just-logged-out', () => false)
  const justLoggedOut = useLogoutFlag()

  // Track if we're currently handling auth change to prevent re-entry
  const useAuthHandling = (): Ref<boolean> => useState('auth-handling', () => false)
  const isHandlingAuth = useAuthHandling()

  if (!authWatcher.value) {
    authWatcher.value = onAuthStateChanged(getAuth(), async (user) => {
      try {
        // Prevent re-entry while handling auth change
        if (isHandlingAuth.value) {
          console.info('Auth handler already running, skipping')
          return
        }

        isHandlingAuth.value = true

        if (user === null) {
          // No Firebase user - leave profile state unset.
          // Guest profiles are now created lazily by the start screen
          // when the player begins a game while not signed in.
          if (justLoggedOut.value) {
            // Clear the flag after the first null user event post-logout
            justLoggedOut.value = false
          }
        } else if (user && !playerProfile.current.value) {
          // User logged in - check for existing authenticated profile FIRST
          initializeSync()

          const hasGuest = await playerProfile.hasLocalProfile('guest_profile')

          if (hasGuest) {
            // Guest profile exists - need to merge with authenticated profile
            // CRITICAL: Check Firestore FIRST before transferring
            console.info('Guest profile detected, checking for existing remote profile')

            await transferGuestToAuthProfile(user)
          } else {
            // No guest profile - check for local authenticated profile
            const hasLocal = await playerProfile.hasLocalProfile(user.uid)

            if (hasLocal) {
              // Local authenticated profile exists - load it
              console.info('Loading existing authenticated profile')
              await playerProfile.getProfile(user)
              await playerProfile.syncPull()

              // Sync game saves on login
              try {
                const { useStoreManager } = await import('~/composables/useStoreManager')
                const storeManager = useStoreManager()
                storeManager.initializeSync()
                await storeManager.syncPull(user.uid)
                console.info('Game saves synced on login')
              } catch (saveSyncError) {
                console.warn('Failed to sync game saves on login:', saveSyncError)
              }
            } else {
              // No local profile at all - check remote first before creating new
              try {
                initializeSync()
                const adapter = playerProfile.syncAdapter.value
                const remoteProfile = adapter ? await adapter.pull(user.uid) : null

                if (remoteProfile) {
                  // Use the migration function to load remote profile
                  await playerProfile.migrateFromFirestore(user)
                } else {
                  // No profile anywhere - create new and push to remote
                  await playerProfile.getProfile(user)
                  await playerProfile.syncPush()
                }

                // Sync game saves on login
                try {
                  const { useStoreManager } = await import('~/composables/useStoreManager')
                  const storeManager = useStoreManager()
                  storeManager.initializeSync()
                  await storeManager.syncPull(user.uid)
                  console.info('Game saves synced on login')
                } catch (saveSyncError) {
                  console.warn('Failed to sync game saves on login:', saveSyncError)
                }
              } catch (error) {
                console.error('Error checking remote profile:', error)
                // Fallback: create new profile (but don't push to avoid overwriting)
                await playerProfile.getProfile(user)
              }
            }
          }
        } else if (user && playerProfile.current.value) {
          // If a guest profile is currently loaded when the user authenticates,
          // transfer it immediately without waiting for a refresh
          if (playerProfile.current.value.isGuest) {
            initializeSync()

            await transferGuestToAuthProfile(user)
          } else {
            // Authenticated profile already loaded - ensure sync is active
            initializeSync()

            // Initialize game saves sync
            try {
              const { useStoreManager } = await import('~/composables/useStoreManager')
              const storeManager = useStoreManager()
              storeManager.initializeSync()
            } catch (saveSyncError) {
              console.warn('Failed to initialize game saves sync:', saveSyncError)
            }
          }
        }
      } finally {
        // Always reset the flag
        isHandlingAuth.value = false
      }
    })
  }

  return {
    // Existing API
    current: playerProfile.current,
    getProfile: playerProfile.getProfile,
    updateProfile: playerProfile.updateProfile,
    transferGuestProfile: playerProfile.transferGuestProfile,
    hasLocalProfile: playerProfile.hasLocalProfile,
    getLocalData: playerProfile.getLocalData,
    loadLocalGuestProfile: playerProfile.loadLocalGuestProfile,
    updateGameRecord: playerProfile.updateGameRecord,
    updatePlayerStats: playerProfile.updatePlayerStats,
    resetLocal: async (uid?: string) => {
      // Set logout flag to prevent immediate guest creation
      justLoggedOut.value = true
      await playerProfile.resetLocal(uid)
    },

    // Sync API
    syncStatus: playerProfile.syncStatus,
    sync: playerProfile.sync,
    syncPull: playerProfile.syncPull,
    syncPush: playerProfile.syncPush,
    getSyncMetadata: playerProfile.getSyncMetadata,
  }
}
