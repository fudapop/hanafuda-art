/**
 * @fileoverview Firestore queries for the public leaderboard.
 *
 * List queries are capped. A player's rank outside that page is a count of
 * rows that sort strictly ahead of them, so ties share a rank.
 */
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore'
import {
  LEADERBOARD_LIMIT,
  type LeaderboardEntry,
  type LeaderboardFilter,
  readLeaderboardEntry,
} from './leaderboard'

export type RankSnapshot = Pick<
  LeaderboardEntry,
  'hasGames' | 'meetsMinGames' | 'record' | 'totalGames' | 'winRate'
>

/**
 * Capped, ordered query for one Rankings filter.
 * Only players with at least one finished game are included.
 *
 * @param db - Firestore instance
 * @param filter - Rankings filter
 */
export function leaderboardListQuery(db: Firestore, filter: LeaderboardFilter) {
  const ref = collection(db, 'leaderboard')
  const played = where('hasGames', '==', true)

  switch (filter) {
    case 'active':
      return query(ref, played, orderBy('totalGames', 'desc'), limit(LEADERBOARD_LIMIT))
    case 'wins':
      return query(ref, played, orderBy('record.win', 'desc'), limit(LEADERBOARD_LIMIT))
    case 'winrate':
      return query(
        ref,
        played,
        where('meetsMinGames', '==', true),
        orderBy('winRate', 'desc'),
        limit(LEADERBOARD_LIMIT),
      )
    case 'overall':
    default:
      return query(
        ref,
        played,
        orderBy('meetsMinGames', 'desc'),
        orderBy('record.coins', 'desc'),
        orderBy('record.win', 'desc'),
        orderBy('winRate', 'desc'),
        limit(LEADERBOARD_LIMIT),
      )
  }
}

/**
 * Load one Rankings page from `leaderboard`.
 *
 * @param db - Firestore instance
 * @param filter - Rankings filter
 * @returns Public rows in query order
 */
export async function fetchLeaderboardPage(
  db: Firestore,
  filter: LeaderboardFilter,
): Promise<LeaderboardEntry[]> {
  const snapshot = await getDocs(leaderboardListQuery(db, filter))
  const players: LeaderboardEntry[] = []

  snapshot.forEach((docSnap) => {
    const entry = readLeaderboardEntry(docSnap.id, docSnap.data())
    if (entry?.hasGames) players.push(entry)
  })

  return players
}

/**
 * Rank of one player, counting every public row that sorts ahead of them.
 * Win-rate rank is null until the player has the minimum number of games.
 * Players with no finished games are not ranked.
 *
 * @param db - Firestore instance
 * @param filter - Rankings filter
 * @param entry - The player being ranked
 * @returns 1-based rank, or null when this filter does not rank the player
 */
export async function fetchLeaderboardRank(
  db: Firestore,
  filter: LeaderboardFilter,
  entry: RankSnapshot,
): Promise<number | null> {
  if (!entry.hasGames) return null
  if (filter === 'winrate' && !entry.meetsMinGames) return null

  const counts: Array<QueryConstraint[]> = []

  if (filter === 'active') {
    counts.push([where('hasGames', '==', true), where('totalGames', '>', entry.totalGames)])
  } else if (filter === 'wins') {
    counts.push([where('hasGames', '==', true), where('record.win', '>', entry.record.win)])
  } else if (filter === 'winrate') {
    counts.push([
      where('hasGames', '==', true),
      where('meetsMinGames', '==', true),
      where('winRate', '>', entry.winRate),
    ])
  } else {
    if (!entry.meetsMinGames) {
      counts.push([where('hasGames', '==', true), where('meetsMinGames', '==', true)])
    }
    counts.push([
      where('hasGames', '==', true),
      where('meetsMinGames', '==', entry.meetsMinGames),
      where('record.coins', '>', entry.record.coins),
    ])
    counts.push([
      where('hasGames', '==', true),
      where('meetsMinGames', '==', entry.meetsMinGames),
      where('record.coins', '==', entry.record.coins),
      where('record.win', '>', entry.record.win),
    ])
    counts.push([
      where('hasGames', '==', true),
      where('meetsMinGames', '==', entry.meetsMinGames),
      where('record.coins', '==', entry.record.coins),
      where('record.win', '==', entry.record.win),
      where('winRate', '>', entry.winRate),
    ])
  }

  const totals = await Promise.all(counts.map((constraints) => countPlayers(db, constraints)))
  return totals.reduce((sum, count) => sum + count, 0) + 1
}

async function countPlayers(db: Firestore, constraints: QueryConstraint[]): Promise<number> {
  const snapshot = await getCountFromServer(query(collection(db, 'leaderboard'), ...constraints))
  return snapshot.data().count
}
