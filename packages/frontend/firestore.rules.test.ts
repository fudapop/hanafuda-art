/**
 * Firestore rules for private user profiles and the public leaderboard.
 *
 * Run from packages/frontend (the emulator is required):
 *   pnpm test:rules
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { fetchLeaderboardPage, fetchLeaderboardRank } from './app/utils/leaderboardQuery'

const PROJECT_ID = 'new-hanafuda'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
  const [host, portText] = emulator.split(':')

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      host: host || '127.0.0.1',
      port: Number(portText) || 8080,
    },
  })
})

afterEach(async () => {
  await testEnv.clearFirestore()
})

afterAll(async () => {
  await testEnv.cleanup()
})

describe('users documents', () => {
  it('lets the owner read and update their own document, and rejects email', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const bob = testEnv.authenticatedContext('bob').firestore()
    const anon = testEnv.unauthenticatedContext().firestore()

    await assertSucceeds(
      setDoc(doc(alice, 'users', 'u_alice'), { username: 'Ada', record: { coins: 1 } }),
    )
    await assertSucceeds(getDoc(doc(alice, 'users', 'u_alice')))

    await assertFails(getDoc(doc(bob, 'users', 'u_alice')))
    await assertFails(getDocs(collection(bob, 'users')))
    await assertFails(getDocs(collection(alice, 'users')))
    await assertFails(getDoc(doc(anon, 'users', 'u_alice')))
    await assertFails(setDoc(doc(alice, 'users', 'u_bob'), { username: 'Nope' }))
    await assertFails(
      setDoc(doc(alice, 'users', 'u_alice'), { username: 'Ada', email: 'ada@example.com' }),
    )

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', 'u_alice'), {
        username: 'Ada',
        email: 'ada@example.com',
      })
    })

    await assertFails(
      setDoc(doc(alice, 'users', 'u_alice'), { username: 'Ada Updated' }, { merge: true }),
    )
    await assertSucceeds(
      setDoc(
        doc(alice, 'users', 'u_alice'),
        { username: 'Ada Updated', email: deleteField() },
        { merge: true },
      ),
    )

    const saved = await getDoc(doc(alice, 'users', 'u_alice'))
    expect(saved.exists()).toBe(true)
    expect(saved.data()).not.toHaveProperty('email')
    expect(saved.data()?.username).toBe('Ada Updated')
  })
})

describe('leaderboard documents', () => {
  it('lets the owner publish public fields and lets anyone read them', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const anon = testEnv.unauthenticatedContext().firestore()

    await assertSucceeds(setDoc(doc(alice, 'leaderboard', 'alice'), validEntry('alice')))
    await assertSucceeds(
      setDoc(
        doc(alice, 'leaderboard', 'alice'),
        validEntry('alice', {
          record: { win: 0, loss: 0, draw: 0, coins: 500 },
          totalGames: 0,
          winRate: 0,
          hasGames: false,
          meetsMinGames: false,
        }),
      ),
    )
    await assertSucceeds(getDoc(doc(anon, 'leaderboard', 'alice')))

    await assertFails(
      setDoc(doc(alice, 'leaderboard', 'alice'), {
        ...validEntry('alice'),
        email: 'ada@example.com',
      }),
    )
    await assertFails(
      setDoc(doc(alice, 'leaderboard', 'alice'), {
        ...validEntry('alice'),
        settings: { sound: true },
      }),
    )
    await assertFails(setDoc(doc(alice, 'leaderboard', 'alice'), validEntry('bob')))
    await assertFails(setDoc(doc(alice, 'leaderboard', 'bob'), validEntry('bob')))
    await assertFails(setDoc(doc(anon, 'leaderboard', 'alice'), validEntry('alice')))
    await assertFails(deleteDoc(doc(alice, 'leaderboard', 'bob')))
    await assertSucceeds(deleteDoc(doc(alice, 'leaderboard', 'alice')))
  })

  it('serves a capped ordered page and a rank without reading private user docs', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(
        doc(db, 'leaderboard', 'high'),
        entryDoc('high', { coins: 500, wins: 50, games: 80, qualified: true }),
      )
      await setDoc(
        doc(db, 'leaderboard', 'mid'),
        entryDoc('mid', { coins: 100, wins: 40, games: 50, qualified: true }),
      )
      await setDoc(
        doc(db, 'leaderboard', 'low'),
        entryDoc('low', { coins: 9000, wins: 1, games: 10, qualified: false }),
      )
      await setDoc(
        doc(db, 'leaderboard', 'idle'),
        entryDoc('idle', { coins: 500, wins: 0, games: 0, qualified: false }),
      )
      await setDoc(doc(db, 'users', 'u_high'), { email: 'hidden@example.com', username: 'Secret' })
    })

    const reader = testEnv.unauthenticatedContext().firestore()
    const overall = await fetchLeaderboardPage(reader, 'overall')
    const active = await fetchLeaderboardPage(reader, 'active')
    const wins = await fetchLeaderboardPage(reader, 'wins')

    expect(overall.map((player) => player.uid)).toEqual(['high', 'mid', 'low'])
    expect(active.map((player) => player.uid)).toEqual(['high', 'mid', 'low'])
    expect(wins.map((player) => player.uid)).toEqual(['high', 'mid', 'low'])
    expect(overall.some((player) => 'email' in player)).toBe(false)

    const low = overall.find((player) => player.uid === 'low')
    const high = overall.find((player) => player.uid === 'high')
    expect(low && (await fetchLeaderboardRank(reader, 'overall', low))).toBe(3)
    expect(high && (await fetchLeaderboardRank(reader, 'overall', high))).toBe(1)
    expect(low && (await fetchLeaderboardRank(reader, 'winrate', low))).toBeNull()
    await assertFails(getDoc(doc(reader, 'users', 'u_high')))
  })
})

function validEntry(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    uid,
    username: 'Ada',
    avatar: '/avatars/flat-crane.webp',
    isGuest: false,
    record: { win: 60, loss: 30, draw: 10, coins: 1200 },
    totalGames: 100,
    winRate: 60,
    hasGames: true,
    meetsMinGames: true,
    lastUpdated: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
    ...overrides,
  }
}

function entryDoc(
  uid: string,
  stats: { coins: number; wins: number; games: number; qualified: boolean },
) {
  const losses = Math.max(stats.games - stats.wins, 0)
  return validEntry(uid, {
    username: uid,
    record: { win: stats.wins, loss: losses, draw: 0, coins: stats.coins },
    totalGames: stats.games,
    winRate: stats.games > 0 ? (stats.wins / stats.games) * 100 : 0,
    hasGames: stats.games > 0,
    meetsMinGames: stats.qualified,
  })
}
