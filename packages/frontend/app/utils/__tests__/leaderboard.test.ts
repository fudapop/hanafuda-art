import { describe, expect, it } from 'vitest'
import {
  LEADERBOARD_MIN_GAMES,
  buildLeaderboardEntry,
  competitionRanks,
  rankingCoins,
  readLeaderboardEntry,
  type LeaderboardEntry,
} from '../leaderboard'

const played = {
  uid: 'player-1',
  username: 'Hana',
  avatar: '/avatars/flat-crane.webp',
  email: 'hana@example.com',
  isGuest: false,
  record: { win: 30, loss: 15, draw: 5, coins: 200 },
  designs: { unlocked: ['a', 'b', 'c', 'd'] },
  lastUpdated: new Date('2026-02-01T00:00:00Z'),
}

describe('rankingCoins', () => {
  it('adds 500 coins for each unlocked design past the third', () => {
    expect(rankingCoins(200, 3)).toBe(200)
    expect(rankingCoins(200, 2)).toBe(200)
    expect(rankingCoins(200, 4)).toBe(700)
    expect(rankingCoins(200, 6)).toBe(1700)
  })
})

describe('buildLeaderboardEntry', () => {
  it('publishes ranking fields and leaves email off the snapshot', () => {
    const originalCoins = played.record.coins
    const entry = buildLeaderboardEntry(played)

    expect(entry).toMatchObject({
      uid: 'player-1',
      username: 'Hana',
      avatar: '/avatars/flat-crane.webp',
      isGuest: false,
      record: { win: 30, loss: 15, draw: 5, coins: 700 },
      totalGames: 50,
      winRate: 60,
      hasGames: true,
      meetsMinGames: true,
    })
    expect(entry).not.toHaveProperty('email')
    expect(played.record.coins).toBe(originalCoins)
  })

  it('keeps a zero-game profile public for names, but off the board', () => {
    const entry = buildLeaderboardEntry({
      uid: 'new-player',
      record: { win: 0, loss: 0, draw: 0, coins: 500 },
    })

    expect(entry).toMatchObject({
      uid: 'new-player',
      username: 'Anonymous Player',
      avatar: '/avatars/flat-crane.webp',
      totalGames: 0,
      winRate: 0,
      hasGames: false,
      meetsMinGames: false,
      record: { coins: 500 },
    })
  })

  it('requires the minimum game count before meetsMinGames is set', () => {
    const below = buildLeaderboardEntry({
      uid: 'below',
      record: { win: LEADERBOARD_MIN_GAMES - 1, loss: 0, draw: 0, coins: 0 },
    })
    const exact = buildLeaderboardEntry({
      uid: 'exact',
      record: { win: LEADERBOARD_MIN_GAMES, loss: 0, draw: 0, coins: 0 },
    })

    expect(below?.meetsMinGames).toBe(false)
    expect(exact?.meetsMinGames).toBe(true)
    expect(exact?.winRate).toBe(100)
  })

  it('returns null without a user id', () => {
    expect(buildLeaderboardEntry({ username: 'Nobody' })).toBeNull()
  })
})

describe('readLeaderboardEntry', () => {
  it('does not adjust coins that are already public', () => {
    const entry = readLeaderboardEntry('player-1', {
      uid: 'player-1',
      username: 'Hana',
      record: { win: 1, loss: 0, draw: 0, coins: 700 },
      totalGames: 1,
      winRate: 100,
      hasGames: true,
      meetsMinGames: false,
      designs: { unlocked: ['a', 'b', 'c', 'd', 'e'] },
    })

    expect(entry?.record.coins).toBe(700)
  })
})

describe('competitionRanks', () => {
  it('gives tied rows the same rank and skips the next number', () => {
    const rows = [
      row({ uid: 'a', coins: 10, wins: 2, winRate: 50 }),
      row({ uid: 'b', coins: 10, wins: 2, winRate: 50 }),
      row({ uid: 'c', coins: 10, wins: 1, winRate: 40 }),
    ]

    expect(competitionRanks(rows, 'overall')).toEqual([1, 1, 3])
    expect(competitionRanks(rows, 'wins')).toEqual([1, 1, 3])
  })
})

function row(overrides: {
  uid: string
  coins: number
  wins: number
  winRate: number
}): LeaderboardEntry {
  return {
    uid: overrides.uid,
    username: overrides.uid,
    avatar: '/avatars/flat-crane.webp',
    isGuest: false,
    record: { win: overrides.wins, loss: 0, draw: 0, coins: overrides.coins },
    totalGames: 50,
    winRate: overrides.winRate,
    hasGames: true,
    meetsMinGames: true,
    lastUpdated: new Date(0),
  }
}
