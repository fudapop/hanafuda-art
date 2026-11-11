/**
 * @fileoverview Public leaderboard snapshots derived from a player profile.
 *
 * Rankings and multiplayer opponent labels read these fields only. Email,
 * settings, unlocked designs, and stats stay on the private user document.
 *
 * @example
 * ```ts
 * const entry = buildLeaderboardEntry(profile)
 * if (entry.hasGames) {
 *   await setDoc(doc(db, 'leaderboard', entry.uid), entry)
 * }
 * ```
 */

/** How many rows the Rankings page loads for each filter. */
export const LEADERBOARD_LIMIT = 50

/** Games required before a player appears on the win-rate board. */
export const LEADERBOARD_MIN_GAMES = 50

/**
 * Coin adjustment copied from the previous Rankings page.
 * Each unlocked design past the third adds 500 coins on the public board.
 */
export const RANKING_FREE_DESIGNS = 3
export const RANKING_COINS_PER_EXTRA_DESIGN = 500

/** Matches the Firestore rules string caps so a profile push cannot be rejected for length. */
export const LEADERBOARD_USERNAME_MAX = 200
export const LEADERBOARD_AVATAR_MAX = 2048

export const LEADERBOARD_FIELD_NAMES = [
  'uid',
  'username',
  'avatar',
  'isGuest',
  'record',
  'totalGames',
  'winRate',
  'hasGames',
  'meetsMinGames',
  'lastUpdated',
] as const

export type LeaderboardFilter = 'overall' | 'active' | 'wins' | 'winrate'

export type LeaderboardRecord = {
  win: number
  loss: number
  draw: number
  coins: number
}

export type LeaderboardEntry = {
  uid: string
  username: string
  avatar: string
  isGuest: boolean
  record: LeaderboardRecord
  totalGames: number
  winRate: number
  /** False when the player has not finished a game. Rankings hides these rows. */
  hasGames: boolean
  meetsMinGames: boolean
  lastUpdated: Date
}

export type LeaderboardSource = {
  uid?: string
  username?: string
  avatar?: string
  isGuest?: boolean
  email?: string
  record?: Partial<LeaderboardRecord> | null
  designs?: { unlocked?: readonly unknown[] | null } | null
  lastUpdated?: Date | string | number | { toDate?: () => Date } | null
}

const DEFAULT_USERNAME = 'Anonymous Player'
const DEFAULT_AVATAR = '/avatars/flat-crane.webp'

/**
 * Public coin total. Does not change the stored profile record.
 *
 * @param rawCoins - Coins saved on the private profile
 * @param unlockedCount - Number of unlocked deck designs
 * @returns Coins shown on the leaderboard
 */
export function rankingCoins(rawCoins: number, unlockedCount: number): number {
  const spentBack =
    Math.max(unlockedCount - RANKING_FREE_DESIGNS, 0) * RANKING_COINS_PER_EXTRA_DESIGN
  return rawCoins + spentBack
}

/**
 * Build the public leaderboard document for a profile.
 * Returns null when there is no user id. Players with zero games still get an
 * entry so multiplayer can show their name; `hasGames` is false in that case.
 *
 * @param source - Profile or legacy `users` document
 * @returns Public fields only, or null when `uid` is missing
 */
export function buildLeaderboardEntry(source: LeaderboardSource): LeaderboardEntry | null {
  const uid = source.uid?.trim()
  if (!uid) return null

  const win = finiteNumber(source.record?.win)
  const loss = finiteNumber(source.record?.loss)
  const draw = finiteNumber(source.record?.draw)
  const unlockedCount = source.designs?.unlocked?.length ?? 0
  const coins = rankingCoins(finiteNumber(source.record?.coins), unlockedCount)
  const totalGames = win + loss + draw

  return {
    uid,
    username: clip(source.username?.trim() || DEFAULT_USERNAME, LEADERBOARD_USERNAME_MAX),
    avatar: clip(source.avatar?.trim() || DEFAULT_AVATAR, LEADERBOARD_AVATAR_MAX),
    isGuest: source.isGuest === true,
    record: { win, loss, draw, coins },
    totalGames,
    winRate: totalGames > 0 ? (win / totalGames) * 100 : 0,
    hasGames: totalGames > 0,
    meetsMinGames: totalGames >= LEADERBOARD_MIN_GAMES,
    lastUpdated: toDate(source.lastUpdated),
  }
}

/**
 * Read a leaderboard document without reapplying the coin adjustment.
 * Coins stored here are already the public total.
 *
 * @param id - Document id, used when `uid` is missing
 * @param data - Firestore document data
 * @returns Parsed entry, or null when the record is missing
 */
export function readLeaderboardEntry(
  id: string,
  data: LeaderboardSource & {
    totalGames?: number
    winRate?: number
    hasGames?: boolean
    meetsMinGames?: boolean
  },
): LeaderboardEntry | null {
  if (!data.record) return null

  const record = {
    win: finiteNumber(data.record.win),
    loss: finiteNumber(data.record.loss),
    draw: finiteNumber(data.record.draw),
    coins: finiteNumber(data.record.coins),
  }
  const totalGames = Number.isFinite(data.totalGames)
    ? Number(data.totalGames)
    : record.win + record.loss + record.draw

  return {
    uid: data.uid?.trim() || id,
    username: data.username?.trim() || DEFAULT_USERNAME,
    avatar: data.avatar?.trim() || DEFAULT_AVATAR,
    isGuest: data.isGuest === true,
    record,
    totalGames,
    winRate: Number.isFinite(data.winRate)
      ? Number(data.winRate)
      : totalGames > 0
        ? (record.win / totalGames) * 100
        : 0,
    hasGames: typeof data.hasGames === 'boolean' ? data.hasGames : totalGames > 0,
    meetsMinGames:
      typeof data.meetsMinGames === 'boolean'
        ? data.meetsMinGames
        : totalGames >= LEADERBOARD_MIN_GAMES,
    lastUpdated: toDate(data.lastUpdated),
  }
}

/**
 * Whether two already-sorted rows should share a rank for the active filter.
 *
 * @param left - Earlier row
 * @param right - Next row
 * @param filter - Active Rankings filter
 */
export function sameRankKey(
  left: LeaderboardEntry,
  right: LeaderboardEntry,
  filter: LeaderboardFilter,
): boolean {
  switch (filter) {
    case 'active':
      return left.totalGames === right.totalGames
    case 'wins':
      return left.record.win === right.record.win
    case 'winrate':
      return left.winRate === right.winRate
    case 'overall':
    default:
      return (
        left.meetsMinGames === right.meetsMinGames &&
        left.record.coins === right.record.coins &&
        left.record.win === right.record.win &&
        left.winRate === right.winRate
      )
  }
}

/**
 * Competition ranks for an already-ordered page (1, 1, 3 when the first two tie).
 *
 * @param entries - Rows in leaderboard order
 * @param filter - Filter that produced that order
 * @returns Rank for each row
 */
export function competitionRanks(
  entries: readonly LeaderboardEntry[],
  filter: LeaderboardFilter,
): number[] {
  const ranks: number[] = []

  for (let index = 0; index < entries.length; index += 1) {
    const previous = index > 0 ? entries[index - 1] : undefined
    const current = entries[index]
    if (previous && current && sameRankKey(previous, current, filter)) {
      ranks.push(ranks[index - 1] ?? index)
    } else {
      ranks.push(index + 1)
    }
  }

  return ranks
}

function finiteNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max)
}

function toDate(value: LeaderboardSource['lastUpdated']): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    const converted = value.toDate()
    if (converted instanceof Date && !Number.isNaN(converted.getTime())) return converted
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date(0)
}
