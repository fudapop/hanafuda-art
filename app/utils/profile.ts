import { nanoid } from 'nanoid'
import type { GameSettings } from '~~/stores/configStore'
import type { PlayerProfile } from '~~/types/profile'
import { getRandom } from './myUtils'

// Demo mode: only OpenCards deck is available
const DEFAULT_DESIGNS = ['otwarte-karty'] as const

/**
 * Sanitize profile data for storage.
 * Removes Vue reactivity and ensures proper types.
 */
export function sanitizeProfile(profile: PlayerProfile): PlayerProfile {
  const jsonStr = JSON.stringify({
    uid: profile.uid,
    email: profile.email,
    avatar: profile.avatar,
    username: profile.username,
    record: profile.record,
    lastUpdated: profile.lastUpdated,
    designs: {
      unlocked: profile.designs.unlocked,
      liked: profile.designs.liked,
    },
    settings: validateSettings(profile.settings),
    flags: profile.flags,
    isGuest: profile.isGuest,
    stats: profile.stats,
  })

  const parsed = JSON.parse(jsonStr)

  return {
    ...parsed,
    lastUpdated: new Date(parsed.lastUpdated),
  }
}

/**
 * Create a default player profile with given overrides.
 */
export async function createDefaultProfile(
  overrides: Partial<PlayerProfile>,
  defaultAvatar: string,
): Promise<PlayerProfile> {
  return {
    uid: overrides.uid || 'unknown',
    avatar: overrides.avatar || defaultAvatar,
    username: overrides.username || generateRandomUsername(),
    email: overrides.email ?? '',
    lastUpdated: overrides.lastUpdated || new Date(),
    record: overrides.record || { coins: 500, win: 0, draw: 0, loss: 0 },
    designs: overrides.designs || { unlocked: [...DEFAULT_DESIGNS], liked: [] },
    settings: validateSettings(overrides.settings),
    flags: overrides.flags || {
      isNewPlayer: true,
      hasSubmittedFeedback: false,
    },
    isGuest: overrides.isGuest,
    stats: {},
  }
}

/**
 * Normalize timestamp to JavaScript Date.
 */
export function normalizeTimestamp(timestamp: any): Date {
  if (timestamp instanceof Date) {
    return timestamp
  }
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate()
  }
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp)
  }
  return new Date()
}

/**
 * Validate settings object and return default settings if invalid.
 * Demo mode: lock gameplay rules, only labels and cardSize are configurable.
 */
export function validateSettings(settings: unknown): GameSettings {
  // Always enforce demo defaults for gameplay rules
  const demoDefaults = {
    rounds: 3 as const,
    viewings: 'allow' as const,
    double: false,
    wild: false,
  }

  if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
    return {
      ...demoDefaults,
      labels: false,
      cardSize: 1.0,
    }
  }

  // Only allow labels and cardSize to be customized
  return {
    ...demoDefaults,
    labels: (settings as Partial<GameSettings>).labels ?? false,
    cardSize: (settings as Partial<GameSettings>).cardSize ?? 1.0,
  }
}

/**
 * Merge two settings objects.
 */
export function mergeSettings(
  baseSettings: GameSettings | undefined,
  overrideSettings: GameSettings | undefined,
): GameSettings {
  if (!baseSettings && !overrideSettings) {
    return validateSettings(undefined)
  }

  if (!baseSettings && overrideSettings) {
    return validateSettings(overrideSettings)
  }

  if (baseSettings && !overrideSettings) {
    return validateSettings(baseSettings)
  }

  return validateSettings({
    ...baseSettings,
    ...overrideSettings,
  })
}

/**
 * Get default designs array.
 */
export function getDefaultDesigns(): readonly string[] {
  return DEFAULT_DESIGNS
}

/**
 * Generate a random username using hanafuda flowers and animals/brights.
 */
export function generateRandomUsername(): string {
  const flowers = [
    'pine',
    'plum',
    'cherry',
    'wisteria',
    'iris',
    'peony',
    'clover',
    'grass',
    'chrysanthemum',
    'maple',
    'willow',
    'paulownia',
  ]

  const animalsAndBrights = [
    'crane',
    'warbler',
    'cuckoo',
    'bridge',
    'butterfly',
    'boar',
    'moon',
    'geese',
    'sake',
    'deer',
    'swallow',
    'phoenix',
    'lightning',
  ]

  const randomFlower = getRandom(flowers)
  const randomAnimalOrBright = getRandom(animalsAndBrights)
  const randomId = nanoid(4)

  return `${randomFlower}-${randomAnimalOrBright}-${randomId}`
}
