/**
 * Flattened array of all available player statistics keys.
 * Used to initialize stats objects and ensure type safety.
 *
 * Categories:
 * - yakuCompleted_*: Individual yaku (scoring combination) completion counts
 * - cardsCaptured_*: Count of cards captured by type (bright/animal/ribbon/plain)
 * - koikoiCalled_*: Koi-koi decision outcomes (success/fail/reversal/stack)
 * - roundsPlayed_*: Round results (win/loss/draw)
 * - total*: Aggregate counts across categories
 */
export const PLAYER_STATS_KEYS = [
  // Individual yaku completion counts
  'yakuCompleted_gokou',
  'yakuCompleted_shikou',
  'yakuCompleted_ame-shikou',
  'yakuCompleted_sankou',
  'yakuCompleted_hanami-zake',
  'yakuCompleted_tsukimi-zake',
  'yakuCompleted_ino-shika-chou',
  'yakuCompleted_aka-tan',
  'yakuCompleted_ao-tan',
  'yakuCompleted_tan-zaku',
  'yakuCompleted_tane-zaku',
  'yakuCompleted_kasu',
  'yakuCompleted_kuttsuki',
  'yakuCompleted_teshi',
  'yakuCompleted_tsuki-fuda',
  // Card capture counts by type
  'cardsCaptured_bright',
  'cardsCaptured_animal',
  'cardsCaptured_ribbon',
  'cardsCaptured_plain',
  // Koi-koi calls
  'koikoiCalled_success',
  'koikoiCalled_fail',
  'koikoiCalled_reversal',
  'koikoiCalled_stack',
  // Round results
  'roundsPlayed_win',
  'roundsPlayed_loss',
  'roundsPlayed_draw',
  // Simple totals
  'totalYakuCompleted',
  'totalCardsCaptured',
  'totalRoundsPlayed',
] as const

/**
 * Union type of all valid player stats keys derived from PLAYER_STATS_KEYS.
 */
export type PlayerStatsKey = (typeof PLAYER_STATS_KEYS)[number]

/**
 * Metadata attached to player stats for tracking and integrity verification.
 * Includes timestamps, sync information, and tamper-proof hashing.
 */
type PlayerStatsMetadata = {
  createdAt: Date
  updatedAt: Date
  lastSyncAt?: Date // Last sync with remote database
  resetsAt?: Date // Scheduled weekly reset
  /** SHA-256 hash of the stats data for tamper detection */
  hash: string
  /** Algorithm identifier for future-proofing (currently only 'sha256' supported) */
  alg: 'sha256'
}

/**
 * Complete player statistics object with all stat keys and metadata.
 * Each stat key maps to a numeric count, and _meta contains metadata for integrity.
 */
export type PlayerStats = {
  [K in PlayerStatsKey]: number
} & {
  _meta: PlayerStatsMetadata
}

/**
 * Internal helper to normalize dates for consistent hashing.
 * Converts Date objects to ISO strings to ensure the same hash regardless of object instance.
 *
 * @param meta - Metadata without hash and alg fields
 * @returns Normalized metadata with ISO string dates
 */
function normalizeDatesForHashing(meta: Omit<PlayerStatsMetadata, 'hash' | 'alg'>) {
  return {
    createdAt: meta.createdAt instanceof Date ? meta.createdAt.toISOString() : meta.createdAt,
    updatedAt: meta.updatedAt instanceof Date ? meta.updatedAt.toISOString() : meta.updatedAt,
    ...(meta.lastSyncAt && {
      lastSyncAt: meta.lastSyncAt instanceof Date ? meta.lastSyncAt.toISOString() : meta.lastSyncAt,
    }),
    ...(meta.resetsAt && {
      resetsAt: meta.resetsAt instanceof Date ? meta.resetsAt.toISOString() : meta.resetsAt,
    }),
  }
}

/**
 * Generate SHA-256 hash for stats data to detect tampering.
 * Excludes hash and alg fields from the hashing process, sorts keys for consistency.
 *
 * @param stats - The player stats object to hash
 * @returns Promise resolving to hexadecimal hash string
 */
async function generateStatsHash(stats: PlayerStats): Promise<string> {
  const { hash, alg, ...metaWithoutHash } = stats._meta
  const { _meta, ...pureStats } = stats

  // Flatten structure for hashing by appending normalized timestamps directly
  const flattenedStats = {
    ...pureStats,
    ...normalizeDatesForHashing(metaWithoutHash),
  }

  // Sort keys for consistent hashing
  const sortedData = Object.keys(flattenedStats)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = flattenedStats[key as keyof typeof flattenedStats]
        return acc
      },
      {} as Record<string, any>,
    )

  const dataString = JSON.stringify(sortedData)
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(dataString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify the integrity of player stats by comparing stored hash with computed hash.
 * Returns false if hash algorithm is unknown or if hash doesn't match.
 *
 * @param stats - The player stats object to verify
 * @returns Promise resolving to true if stats are verified, false otherwise
 */
export async function verifyStatsIntegrity(stats: PlayerStats): Promise<boolean> {
  const { hash, alg } = stats._meta

  if (alg !== 'sha256') {
    console.warn('Unknown hash algorithm:', alg)
    return false
  }

  try {
    const expectedHash = await generateStatsHash(stats)
    return hash === expectedHash
  } catch (error) {
    console.error('Error verifying stats integrity:', error)
    return false
  }
}

/**
 * Create a tamper-proof version of player stats by computing and attaching a hash.
 * Updates the hash and alg fields in metadata.
 *
 * @param stats - The player stats object to make tamper-proof
 * @returns Promise resolving to stats object with updated hash
 */
export async function createTamperProofStats(stats: PlayerStats): Promise<PlayerStats> {
  const hash = await generateStatsHash(stats)

  return {
    ...stats,
    _meta: {
      ...stats._meta,
      hash,
      alg: 'sha256',
    },
  }
}

/**
 * Create a default player stats object with all values initialized to 0.
 * Always generates a tamper-proof hash for integrity verification.
 *
 * @returns Promise resolving to initialized stats object with hash
 */
export async function getDefaultStats(): Promise<PlayerStats> {
  const stats = PLAYER_STATS_KEYS.reduce(
    (acc, key) => {
      acc[key] = 0
      return acc
    },
    {} as Record<PlayerStatsKey, number>,
  )

  const statsData: PlayerStats = {
    ...stats,
    _meta: {
      createdAt: new Date(),
      updatedAt: new Date(),
      hash: '', // Will be set by createTamperProofStats
      alg: 'sha256',
    },
  }

  return createTamperProofStats(statsData)
}

/**
 * Update player stats with partial data and automatically update metadata.
 * Updates the updatedAt timestamp and regenerates the tamper-proof hash.
 *
 * @param current - The current player stats object
 * @param updates - Partial updates to apply to the stats
 * @returns Promise resolving to updated stats object with new hash
 */
export async function updateStats(
  current: PlayerStats,
  updates: Partial<PlayerStats>,
): Promise<PlayerStats> {
  const updated = {
    ...current,
    ...updates,
    _meta: {
      ...current._meta,
      ...updates._meta,
      // Only set updatedAt if not explicitly provided in updates
      updatedAt: updates._meta?.updatedAt ?? new Date(),
    },
  }

  return createTamperProofStats(updated)
}

/**
 * Helper function to increment a specific stat value.
 * Automatically updates metadata and regenerates hash.
 *
 * @param current - The current player stats object
 * @param key - The stat key to increment
 * @param value - The amount to increment by (default: 1)
 * @returns Promise resolving to updated stats object
 */
export async function incrementStat(
  current: PlayerStats,
  key: PlayerStatsKey,
  value: number = 1,
): Promise<PlayerStats> {
  return updateStats(current, {
    [key]: current[key] + value,
  })
}

/**
 * Helper function to decrement a specific stat value.
 * Prevents values from going below 0 and automatically updates metadata and regenerates hash.
 *
 * @param current - The current player stats object
 * @param key - The stat key to decrement
 * @param value - The amount to decrement by (default: 1)
 * @returns Promise resolving to updated stats object
 */
export async function decrementStat(
  current: PlayerStats,
  key: PlayerStatsKey,
  value: number = 1,
): Promise<PlayerStats> {
  return updateStats(current, {
    [key]: Math.max(0, current[key] - value),
  })
}

/**
 * Helper function to batch update multiple stats with increment/decrement/set operations.
 * More efficient than calling individual update functions when modifying multiple stats.
 * Automatically updates metadata and regenerates hash once for all operations.
 *
 * @param current - The current player stats object
 * @param operations - Array of operations to perform on the stats
 * @returns Promise resolving to updated stats object
 *
 * @example
 * ```ts
 * await updateStatsWithOps(stats, [
 *   { key: 'totalYakuCompleted', op: 'increment', value: 1 },
 *   { key: 'yakuCompleted_gokou', op: 'increment', value: 1 },
 *   { key: 'roundsPlayed_win', op: 'set', value: 10 }
 * ])
 * ```
 */
export async function updateStatsWithOps(
  current: PlayerStats,
  operations: Array<{
    key: PlayerStatsKey
    op: 'increment' | 'decrement' | 'set'
    value: number
  }>,
): Promise<PlayerStats> {
  const updates: Partial<PlayerStats> = {}

  operations.forEach(({ key, op, value }) => {
    switch (op) {
      case 'increment':
        updates[key] = current[key] + value
        break
      case 'decrement':
        updates[key] = Math.max(0, current[key] - value)
        break
      case 'set':
        updates[key] = value
        break
    }
  })

  return updateStats(current, updates)
}

/**
 * Merge two player stats objects by adding their numeric values together.
 * Useful for combining guest and authenticated profiles, or resolving sync conflicts.
 *
 * Merge behavior:
 * - Numeric stats: Added together (e.g., 5 wins + 3 wins = 8 wins)
 * - createdAt: Earliest timestamp
 * - updatedAt: Latest timestamp
 * - lastSyncAt: Latest timestamp (if present)
 * - resetsAt: Latest timestamp (if present)
 * - Hash: Regenerated for integrity
 *
 * @param stats1 - First player stats object
 * @param stats2 - Second player stats object
 * @returns Promise resolving to merged stats object with regenerated hash
 *
 * @example
 * ```ts
 * const guestStats = { totalYakuCompleted: 5, ... }
 * const authStats = { totalYakuCompleted: 10, ... }
 * const merged = await mergePlayerStats(guestStats, authStats)
 * // merged.totalYakuCompleted === 15
 * ```
 */
export async function mergePlayerStats(
  stats1: PlayerStats,
  stats2: PlayerStats,
): Promise<PlayerStats> {
  // Merge numeric stat values by adding them together
  const mergedStats = PLAYER_STATS_KEYS.reduce(
    (acc, key) => {
      acc[key] = (stats1[key] || 0) + (stats2[key] || 0)
      return acc
    },
    {} as Record<PlayerStatsKey, number>,
  )

  // Merge metadata - earliest createdAt, latest updatedAt
  const mergedMeta: Omit<PlayerStats['_meta'], 'hash' | 'alg'> = {
    createdAt:
      stats1._meta.createdAt < stats2._meta.createdAt
        ? stats1._meta.createdAt
        : stats2._meta.createdAt,
    updatedAt:
      stats1._meta.updatedAt > stats2._meta.updatedAt
        ? stats1._meta.updatedAt
        : stats2._meta.updatedAt,
  }

  // Add lastSyncAt if present in either
  if (stats1._meta.lastSyncAt || stats2._meta.lastSyncAt) {
    const syncDates = [stats1._meta.lastSyncAt, stats2._meta.lastSyncAt].filter(
      (d): d is Date => d !== undefined,
    )
    if (syncDates.length > 0) {
      mergedMeta.lastSyncAt = syncDates.reduce((latest, current) =>
        current > latest ? current : latest,
      )
    }
  }

  // Add resetsAt if present in either
  if (stats1._meta.resetsAt || stats2._meta.resetsAt) {
    const resetDates = [stats1._meta.resetsAt, stats2._meta.resetsAt].filter(
      (d): d is Date => d !== undefined,
    )
    if (resetDates.length > 0) {
      mergedMeta.resetsAt = resetDates.reduce((latest, current) =>
        current > latest ? current : latest,
      )
    }
  }

  const merged: PlayerStats = {
    ...mergedStats,
    _meta: {
      ...mergedMeta,
      hash: '', // Will be regenerated
      alg: 'sha256',
    },
  }

  // Regenerate hash for tamper-proofing
  return createTamperProofStats(merged)
}
