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
        }
      } catch (pullError) {
        console.warn('Failed to check remote profile:', pullError)
        // Continue - might be first time user, no remote profile yet
      }

      // Step 2: Transfer/merge guest profile
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

      // Step 4: Show success notification
      if (import.meta.client) {
        try {
          await nextTick()
          const { toast } = await import('vue-sonner')
          toast.success('Progress saved successfully!', { duration: 3000 })
        } catch (toastError) {
          console.warn('Failed to show toast notification:', toastError)
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
      // Prevent re-entry while handling auth change
      if (isHandlingAuth.value) {
        console.info('Auth handler already running, skipping')
        return
      }

      isHandlingAuth.value = true

      try {
        if (user === null) {
          // No Firebase user - guest mode
          // Check if we need to create/load guest profile
          if (!playerProfile.current.value) {
            // Don't create guest immediately after logout
            if (justLoggedOut.value) {
              console.info('Just logged out, skipping guest creation')
              justLoggedOut.value = false
              return
            }

            const { createLocalGuestProfile } = await import('~/composables/usePlayerProfile')
            const hasGuest = await playerProfile.hasLocalProfile('guest_profile')

            if (hasGuest) {
              // Load existing guest profile
              const guestProfile = await createLocalGuestProfile()
              await playerProfile.loadLocalGuestProfile(guestProfile)
              console.info('Guest profile loaded')
            } else {
              // Create new guest profile
              const guestProfile = await createLocalGuestProfile()
              await playerProfile.loadLocalGuestProfile(guestProfile)
              console.info('New guest profile created')
            }
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
