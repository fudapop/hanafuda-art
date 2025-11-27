import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useConfigStore, type GameSettings } from '../../stores/configStore'

// For these tests we don't care about DexBee/IndexedDB – use the in-memory fallback store
vi.mock('dexbee-js', () => {
  throw new Error('dexbee-js disabled in guest profile tests')
})

describe('usePlayerProfile - guest profile integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds a new guest profile settings from the current config store', async () => {
    const config = useConfigStore()

    const customSettings: GameSettings = {
      rounds: 12,
      viewings: 'limited',
      double: true,
      wild: true,
      labels: true,
      cardSize: 1.2,
    }

    // Simulate user choosing custom settings before starting a guest game
    config.loadUserSettings(customSettings)

    const { createLocalGuestProfile } = await import('../../app/composables/usePlayerProfile')

    const guest = await createLocalGuestProfile('test-guest')

    // Guest profile settings should exactly mirror the current config settings
    expect(guest.settings).toEqual(config.getCurrentSettings)
  })

  it('loads a local guest profile and hydrates the config store from its settings', async () => {
    const config = useConfigStore()

    const [{ getDefaultDesigns }, { getDefaultStats }, { usePlayerProfile }] = await Promise.all([
      import('../../app/utils/profile'),
      import('../../app/utils/stats'),
      import('../../app/composables/usePlayerProfile'),
    ])

    const defaultStats = await getDefaultStats()

    const guestSettings: GameSettings = {
      rounds: 6,
      viewings: 'none',
      double: true,
      wild: true,
      labels: true,
      cardSize: 0.8,
    }

    const guestProfile = {
      uid: 'guest_profile',
      avatar: '/avatars/test.webp',
      username: 'Guest Tester',
      email: '',
      lastUpdated: new Date(),
      record: { coins: 0, win: 0, draw: 0, loss: 0 },
      designs: { unlocked: [...getDefaultDesigns()], liked: [] },
      settings: guestSettings,
      flags: { isNewPlayer: false, hasSubmittedFeedback: false },
      isGuest: true as const,
      stats: defaultStats,
    }

    const playerProfile = usePlayerProfile()

    // Before loading, config should still be at defaults
    expect(config.settingsLoaded).toBe(false)

    await playerProfile.loadLocalGuestProfile(guestProfile as any)

    // After loading, settingsLoaded should be true and config should match the guest profile
    expect(config.settingsLoaded).toBe(true)
    expect(config.getCurrentSettings).toEqual(guestSettings)
  })
})
