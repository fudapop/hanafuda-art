import { nanoid } from 'nanoid'
import type { PlayerProfile } from '~/types/profile'
import { getRandom } from './myUtils'
import { createTamperProofStats, getDefaultStats, verifyStatsIntegrity } from './stats'

const DEFAULT_DESIGNS = ['cherry-version', 'ramen-red', 'flash-black'] as const

/**
 * Sanitize profile data for storage.
 * Removes Vue reactivity and ensures proper types (e.g., Date objects).
 * Creates a plain JavaScript object suitable for IndexedDB or JSON serialization.
 *
 * @param profile - The profile to sanitize (may contain Vue reactive properties)
 * @returns Plain profile object without reactivity
 */
export function sanitizeProfile(profile: PlayerProfile): PlayerProfile {
  // Use JSON.parse(JSON.stringify()) to remove all reactivity and ensure cloneability
  // This is the most reliable way to ensure data can be stored in IndexedDB
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
    settings: profile.settings || {},
    flags: profile.flags,
    isGuest: profile.isGuest,
    stats: profile.stats,
  })

  const parsed = JSON.parse(jsonStr)

  // Restore Date object (JSON.stringify converts it to string)
  return {
    ...parsed,
    lastUpdated: new Date(parsed.lastUpdated),
  }
}

/**
 * Validate player stats integrity and merge with defaults.
 * Verifies the hash, resets if tampered, and adds any missing stat keys.
 *
 * @param stats - The stats object to validate
 * @returns Promise resolving to validated and merged stats with valid hash
 *
 * @example
 * ```ts
 * const validatedStats = await validatePlayerStats(loadedProfile.stats)
 * // Returns default stats if hash verification fails
 * // Otherwise merges with defaults to add any new stat keys
 * ```
 */
export async function validatePlayerStats(
  stats: PlayerProfile['stats'],
): Promise<PlayerProfile['stats']> {
  // Generate defaults to merge any new keys
  const defaultStats = await getDefaultStats()

  // Verify stats integrity when loading user data
  if (!(await verifyStatsIntegrity(stats))) {
    console.warn('Stats integrity verification failed - resetting to defaults')
    // Reset to default stats if verification fails
    return defaultStats
  }

  // Merge with defaults to handle any missing keys (schema evolution)
  const mergedStats = { ...defaultStats, ...stats }

  return createTamperProofStats(mergedStats)
}

/**
 * Create a default player profile with given overrides.
 * Provides sensible defaults for all required fields.
 *
 * @param overrides - Partial profile data to override defaults
 * @param defaultAvatar - Default avatar to use if not provided in overrides
 * @returns Promise resolving to complete profile with defaults
 *
 * @example
 * ```ts
 * const profile = await createDefaultProfile({
 *   uid: 'user123',
 *   username: 'Player1'
 * }, 'avatar.webp')
 * // Returns profile with provided values and defaults for other fields
 * ```
 */
export async function createDefaultProfile(
  overrides: Partial<PlayerProfile>,
  defaultAvatar: string,
): Promise<PlayerProfile> {
  // Validate stats if provided, otherwise use defaults
  const validatedStats = overrides.stats
    ? await validatePlayerStats(overrides.stats)
    : await getDefaultStats()

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
    stats: validatedStats,
  }
}

/**
 * Normalize Firestore Timestamp objects to JavaScript Dates.
 * Handles both Date objects and Firestore Timestamp objects with toDate() method.
 *
 * @param timestamp - Date, Firestore Timestamp, or string to normalize
 * @returns JavaScript Date object
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
 * Validate settings object and return default settings if invalid
 * @param settings - Settings object to validate
 * @returns Valid settings object
 */
function validateSettings(settings: any): Record<string, unknown> {
  // If settings is empty, null, undefined, or not an object, return defaults
  if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
    return {
      rounds: 3,
      viewings: 'allow',
      double: false,
      wild: false,
      labels: false,
      cardSize: 1.0,
    }
  }

  // Settings exist, ensure all required fields have valid values
  return {
    rounds: settings.rounds ?? 3,
    viewings: settings.viewings ?? 'allow',
    double: settings.double ?? false,
    wild: settings.wild ?? false,
    labels: settings.labels ?? false,
    cardSize: settings.cardSize ?? 1.0,
  }
}

/**
 * Sanitize Firestore data for local storage.
 * Converts Firestore-specific types (Timestamps) to standard JavaScript types.
 *
 * @param firestoreData - Raw data from Firestore document
 * @param uid - User ID to use if not present in data
 * @param defaultAvatar - Default avatar to use if not present in data
 * @returns Sanitized profile suitable for IndexedDB
 */
export async function sanitizeFirestoreData(
  firestoreData: any,
  uid: string,
  defaultAvatar: string,
): Promise<PlayerProfile> {
  return {
    uid: firestoreData.uid || uid,
    email: firestoreData.email || '',
    avatar: firestoreData.avatar || defaultAvatar,
    username: firestoreData.username || generateRandomUsername(),
    record: firestoreData.record || { coins: 500, win: 0, draw: 0, loss: 0 },
    // Handle Firestore Timestamp -> Date conversion
    lastUpdated: normalizeTimestamp(firestoreData.lastUpdated),
    designs: firestoreData.designs || { unlocked: [...DEFAULT_DESIGNS], liked: [] },
    settings: validateSettings(firestoreData.settings),
    flags: firestoreData.flags || { isNewPlayer: true, hasSubmittedFeedback: false },
    isGuest: firestoreData.isGuest,
    stats: firestoreData.stats
      ? await validatePlayerStats(firestoreData.stats)
      : await getDefaultStats(),
  }
}

/**
 * Calculate updated game record after a game result.
 * Increments the appropriate result counter and adjusts coins.
 *
 * @param currentRecord - Current game record
 * @param result - Game result ('win', 'loss', or 'draw')
 * @param coinsEarned - Coins to add (can be negative)
 * @returns Updated record object
 *
 * @example
 * ```ts
 * const newRecord = calculateGameRecord(
 *   { coins: 500, win: 5, loss: 3, draw: 1 },
 *   'win',
 *   100
 * )
 * // Returns { coins: 600, win: 6, loss: 3, draw: 1 }
 * ```
 */
export function calculateGameRecord(
  currentRecord: PlayerProfile['record'],
  result: 'win' | 'loss' | 'draw',
  coinsEarned: number,
): PlayerProfile['record'] {
  return {
    ...currentRecord,
    [result]: currentRecord[result] + 1,
    coins: currentRecord.coins + coinsEarned,
  }
}

/**
 * Check if a profile has missing stat keys compared to current schema.
 * Useful for detecting profiles that need migration.
 *
 * @param stats - Stats object to check
 * @returns True if stats are missing keys from current schema
 */
export async function hasMissingStatKeys(stats: PlayerProfile['stats']): Promise<boolean> {
  const defaultStats = await getDefaultStats()
  const defaultKeys = Object.keys(defaultStats).filter((k) => k !== '_meta')
  const currentKeys = Object.keys(stats).filter((k) => k !== '_meta')

  return defaultKeys.some((key) => !currentKeys.includes(key))
}

/**
 * Get default designs array.
 * Used for profile initialization and legacy profile migration.
 *
 * @returns Array of default design IDs
 */
export function getDefaultDesigns(): readonly string[] {
  return DEFAULT_DESIGNS
}

/**
 * Generate a random username using hanafuda flowers and animals/brights.
 * Format: 'flower-animal/bright-nanoid' (e.g., 'cherry-bridge-3j4k')
 *
 * @returns Random username string
 *
 * @example
 * ```ts
 * const username = generateRandomUsername()
 * // Returns something like 'pine-crane-3j4k' or 'cherry-bridge-7m2n'
 * ```
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
