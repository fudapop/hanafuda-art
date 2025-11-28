import { useAvatar } from '~/composables/useAvatar'
import { getDexBeeDb } from '~/composables/useDexBee'
import { createDefaultProfile, generateRandomUsername, sanitizeProfile } from '~/utils/profile'
import { useConfigStore, type GameSettings } from '~~/stores/configStore'
import type { LocalProfileStore, PlayerProfile } from '~~/types/profile'

// In-memory fallback store for tests / environments without IndexedDB
const memoryStores = {
  byId: new Map<string, PlayerProfile>(),
}

const getCurrentGameSettings = (config: ReturnType<typeof useConfigStore>): GameSettings => {
  return { ...config.getCurrentSettings }
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
    async getSyncMetadata() {
      return null
    },
    async setSyncMetadata() {},
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
    storeInstance = {
      async init() {},
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
      async getSyncMetadata() {
        return null
      },
      async setSyncMetadata() {},
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
 */
export async function createLocalGuestProfile(username?: string): Promise<PlayerProfile> {
  const { getRandomAvatarUrl } = useAvatar()
  const config = useConfigStore()
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
      uid: 'guest_profile',
      email: '',
      username: username || generateRandomUsername(),
      record: { coins: 0, win: 0, draw: 0, loss: 0 }, // Guests start with 0 coins
      isGuest: true,
      // Seed guest profile settings from any pre-game configuration the user chose
      settings: getCurrentGameSettings(config),
    },
    getRandomAvatarUrl((a) => !a.includes('gamblers')),
  )

  // Save to IndexedDB
  await store.set(guestProfile)

  return guestProfile
}

export const usePlayerProfile = () => {
  const useUserProfile = (): Ref<PlayerProfile | null> => useState('profile', () => null)
  const profile = useUserProfile()
  const { p1Avatar } = useAvatar()

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
    const p = await store.get(uid)
    return p !== null
  }

  const deleteLocalData = async (uid: string) => {
    const store = await getStore()
    await store.remove(uid)
  }

  /**
   * Load a local guest profile into the current state
   */
  const loadLocalGuestProfile = async (guestProfile: PlayerProfile) => {
    profile.value = await createDefaultProfile(guestProfile, p1Avatar.value)

    // Load settings into configStore
    if (profile.value?.settings) {
      const config = useConfigStore()
      config.loadUserSettings(profile.value.settings)
    }
  }

  /**
   * Get or create guest profile (simplified for demo)
   */
  const getProfile = async (_user?: any) => {
    if (profile.value) return profile.value

    // Always create/load guest profile in demo mode
    const guestProfile = await createLocalGuestProfile()
    await loadLocalGuestProfile(guestProfile)
    return profile.value
  }

  const updateProfile = async (data: Partial<PlayerProfile>) => {
    if (!profile.value) return

    profile.value = {
      ...(profile.value as PlayerProfile),
      ...(data as PlayerProfile),
      lastUpdated: new Date(),
    }

    await setLocalData()
  }

  const resetLocal = async (uid?: string) => {
    const userId = uid || profile.value?.uid
    if (!userId) return

    profile.value = null as any

    try {
      await deleteLocalData(userId)
    } catch (error) {
      console.warn('Failed to delete local profile:', error)
    }
  }

  const current = computed(() => profile.value)

  // Auto-save profile changes
  watch(
    current,
    () => {
      if (current.value) {
        void setLocalData()
      }
    },
    { deep: true },
  )

  return {
    current,
    getProfile,
    updateProfile,
    resetLocal,
    hasLocalProfile,
    getLocalData,
    loadLocalGuestProfile,
  }
}
