import { usePlayerProfile } from './usePlayerProfile'

/**
 * Simplified profile composable for demo mode.
 * Only supports guest profiles - no authentication or remote sync.
 */
export const useProfile = () => {
  const playerProfile = usePlayerProfile()

  return {
    // Profile API
    current: playerProfile.current,
    getProfile: playerProfile.getProfile,
    updateProfile: playerProfile.updateProfile,
    hasLocalProfile: playerProfile.hasLocalProfile,
    getLocalData: playerProfile.getLocalData,
    loadLocalGuestProfile: playerProfile.loadLocalGuestProfile,
    resetLocal: playerProfile.resetLocal,

    // Stub out sync methods (no-ops in demo mode)
    syncStatus: computed(() => 'idle' as const),
    sync: async () => ({ success: true, local: null, remote: null, action: 'skipped' as const }),
    syncPull: async () => ({
      success: true,
      local: null,
      remote: null,
      action: 'skipped' as const,
    }),
    syncPush: async () => ({
      success: true,
      local: null,
      remote: null,
      action: 'skipped' as const,
    }),
    getSyncMetadata: async () => null,
  }
}
