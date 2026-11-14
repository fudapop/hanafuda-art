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
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
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
      setDoc(doc(alice, 'users', 'u_alice'), {
        uid: 'alice',
        username: 'Ada',
        record: { coins: 1 },
      }),
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
        uid: 'alice',
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

  it('rejects a uid that does not match the authenticated user', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()

    await assertFails(setDoc(doc(alice, 'users', 'u_alice'), { uid: 'bob', username: 'Ada' }))
    await assertSucceeds(setDoc(doc(alice, 'users', 'u_alice'), { uid: 'alice', username: 'Ada' }))
    await assertFails(setDoc(doc(alice, 'users', 'u_alice'), { uid: 'bob' }, { merge: true }))

    await assertFails(setDoc(doc(alice, 'leaderboard', 'alice'), validEntry('bob')))
    await assertSucceeds(setDoc(doc(alice, 'leaderboard', 'alice'), validEntry('alice')))
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

describe('feedback documents', () => {
  it('accepts a bounded feedback write and rejects anything else', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()

    await assertSucceeds(setDoc(doc(anon, 'feedback', 'fb_1'), validFeedback()))
    await assertFails(getDoc(doc(anon, 'feedback', 'fb_1')))
    await assertFails(updateDoc(doc(anon, 'feedback', 'fb_1'), { submitted_by: 'bob' }))
    await assertFails(deleteDoc(doc(anon, 'feedback', 'fb_1')))
    await assertFails(
      setDoc(doc(anon, 'feedback', 'fb_2'), { ...validFeedback(), email: 'ada@example.com' }),
    )
    await assertFails(
      setDoc(doc(anon, 'feedback', 'fb_3'), {
        ...validFeedback(),
        ratings: { animation: 0, controls: 1, image: 1, audio: 1 },
      }),
    )
    await assertFails(
      setDoc(doc(anon, 'feedback', 'fb_4'), {
        ...validFeedback(),
        ratings: { animation: 6, controls: 1, image: 1, audio: 1 },
      }),
    )
    await assertFails(
      setDoc(doc(anon, 'feedback', 'fb_5'), {
        ...validFeedback(),
        comments: { tag: 'spam', message: 'nope' },
      }),
    )
    await assertFails(
      setDoc(doc(anon, 'feedback', 'fb_6'), {
        ...validFeedback(),
        comments: { tag: 'idea', message: 'x'.repeat(2001) },
      }),
    )
  })

  it('requires auth and a matching author for multiplayer feedback', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const anon = testEnv.unauthenticatedContext().firestore()

    await assertSucceeds(setDoc(doc(alice, 'mp-feedback', 'mpfb_1'), validMpFeedback('alice')))
    await assertFails(setDoc(doc(anon, 'mp-feedback', 'mpfb_2'), validMpFeedback('alice')))
    await assertFails(setDoc(doc(alice, 'mp-feedback', 'mpfb_3'), validMpFeedback('bob')))
    await assertFails(
      setDoc(doc(alice, 'mp-feedback', 'mpfb_4'), { ...validMpFeedback('alice'), rating: 9 }),
    )
    await assertFails(getDoc(doc(alice, 'mp-feedback', 'mpfb_1')))
  })
})

describe('announcement impression documents', () => {
  it('lets a player write and read only their own impression', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const bob = testEnv.authenticatedContext('bob').firestore()
    const anon = testEnv.unauthenticatedContext().firestore()
    const aliceImpression = doc(alice, 'announcement_impressions', 'alice_spring')

    await assertSucceeds(setDoc(aliceImpression, validImpression('alice', 'spring')))
    await assertSucceeds(getDoc(aliceImpression))
    await assertSucceeds(
      getDocs(query(collection(alice, 'announcement_impressions'), where('uid', '==', 'alice'))),
    )
    await assertSucceeds(
      updateDoc(aliceImpression, {
        views: 2,
        liked: true,
        updatedAt: Timestamp.fromDate(new Date('2026-04-02T00:00:00Z')),
      }),
    )

    await assertFails(getDoc(doc(bob, 'announcement_impressions', 'alice_spring')))
    await assertFails(getDocs(collection(alice, 'announcement_impressions')))
    await assertFails(getDoc(doc(anon, 'announcement_impressions', 'alice_spring')))
    await assertFails(
      setDoc(
        doc(alice, 'announcement_impressions', 'bob_spring'),
        validImpression('bob', 'spring'),
      ),
    )
    await assertFails(
      setDoc(doc(alice, 'announcement_impressions', 'alice_spring'), {
        ...validImpression('alice', 'spring'),
        title: 'leaked',
      }),
    )
    await assertFails(
      updateDoc(aliceImpression, {
        views: 10,
        updatedAt: Timestamp.fromDate(new Date('2026-04-03T00:00:00Z')),
      }),
    )
    await assertFails(
      updateDoc(aliceImpression, {
        uid: 'bob',
        updatedAt: Timestamp.fromDate(new Date('2026-04-03T00:00:00Z')),
      }),
    )
    await assertFails(deleteDoc(aliceImpression))
  })

  it('lets a player read a missing impression, then save the first view or like', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const bob = testEnv.authenticatedContext('bob').firestore()
    const firstView = doc(alice, 'announcement_impressions', 'alice_first-view')
    const firstLike = doc(alice, 'announcement_impressions', 'alice_first-like')

    await assertSucceeds(getDoc(firstView))
    expect((await getDoc(firstView)).exists()).toBe(false)
    await assertSucceeds(setDoc(firstView, validImpression('alice', 'first-view')))

    await assertSucceeds(getDoc(firstLike))
    await assertSucceeds(
      setDoc(firstLike, { ...validImpression('alice', 'first-like'), views: 0, liked: true }),
    )

    await assertFails(getDoc(doc(bob, 'announcement_impressions', 'alice_first-view')))
    await assertFails(getDoc(doc(bob, 'announcement_impressions', 'alice_not-created')))
    await assertSucceeds(getDoc(doc(bob, 'announcement_impressions', 'bob_not-created')))
  })
})

describe('multiplayer game documents', () => {
  it('lets the host create a waiting game and the opponent join it', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const bob = testEnv.authenticatedContext('bob').firestore()
    const carol = testEnv.authenticatedContext('carol').firestore()
    const anon = testEnv.unauthenticatedContext().firestore()
    const game = doc(alice, 'multiplayer_games', 'game-1')

    await assertSucceeds(setDoc(game, waitingGame('alice')))
    await assertFails(setDoc(doc(bob, 'multiplayer_games', 'game-2'), waitingGame('alice')))
    await assertFails(
      setDoc(doc(alice, 'multiplayer_games', 'game-3'), {
        ...waitingGame('alice'),
        mode: 'single',
      }),
    )
    await assertSucceeds(getDoc(doc(bob, 'multiplayer_games', 'game-1')))
    await assertFails(getDoc(doc(anon, 'multiplayer_games', 'game-1')))

    await assertSucceeds(
      updateDoc(doc(bob, 'multiplayer_games', 'game-1'), {
        p2: 'bob',
        activePlayer: 'alice',
        status: 'active',
        startedAt: Timestamp.fromDate(new Date('2026-04-02T00:00:00Z')),
        lastUpdated: Timestamp.fromDate(new Date('2026-04-02T00:00:00Z')),
      }),
    )
    await assertFails(
      updateDoc(doc(carol, 'multiplayer_games', 'game-1'), {
        p2: 'carol',
        activePlayer: 'alice',
        status: 'active',
        startedAt: Timestamp.fromDate(new Date('2026-04-02T00:00:00Z')),
        lastUpdated: Timestamp.fromDate(new Date('2026-04-02T00:00:00Z')),
      }),
    )
    await assertFails(getDoc(doc(carol, 'multiplayer_games', 'game-1')))
  })

  it('lets only the active player change turn state, and keeps p1, p2, and mode fixed', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const bob = testEnv.authenticatedContext('bob').firestore()
    const createdAt = Timestamp.fromDate(new Date('2026-04-01T00:00:00Z'))
    const later = Timestamp.fromDate(new Date('2026-04-02T00:00:00Z'))

    await assertSucceeds(setDoc(doc(alice, 'multiplayer_games', 'game-1'), waitingGame('alice')))
    await assertSucceeds(
      updateDoc(doc(bob, 'multiplayer_games', 'game-1'), {
        p2: 'bob',
        activePlayer: 'alice',
        status: 'active',
        startedAt: later,
        lastUpdated: later,
      }),
    )

    const base = activeGame('alice', 'bob', createdAt, later)

    await assertFails(
      setDoc(
        doc(bob, 'multiplayer_games', 'game-1'),
        {
          ...base,
          gameState: gameState('game-1', 3),
          lastUpdated: Timestamp.fromDate(new Date('2026-04-03T00:00:00Z')),
        },
        { merge: true },
      ),
    )
    await assertFails(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-1'),
        { ...base, p1: 'carol', lastUpdated: later },
        { merge: true },
      ),
    )
    await assertFails(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-1'),
        { ...base, p2: 'carol', lastUpdated: later },
        { merge: true },
      ),
    )
    await assertFails(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-1'),
        { ...base, mode: 'single', lastUpdated: later },
        { merge: true },
      ),
    )

    await assertSucceeds(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-1'),
        {
          ...base,
          gameState: gameState('game-1', 2),
          activePlayer: 'bob',
          lastUpdated: Timestamp.fromDate(new Date('2026-04-04T00:00:00Z')),
        },
        { merge: true },
      ),
    )
    await assertFails(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-1'),
        {
          ...base,
          activePlayer: 'bob',
          gameState: gameState('game-1', 4),
          lastUpdated: Timestamp.fromDate(new Date('2026-04-05T00:00:00Z')),
        },
        { merge: true },
      ),
    )
  })

  it('rejects an active player forging the opponent ack, and allows clearing two real acks', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const bob = testEnv.authenticatedContext('bob').firestore()
    const createdAt = Timestamp.fromDate(new Date('2026-04-01T00:00:00Z'))
    const startedAt = Timestamp.fromDate(new Date('2026-04-02T00:00:00Z'))

    await assertSucceeds(
      setDoc(doc(alice, 'multiplayer_games', 'game-acks'), waitingGame('alice', 'game-acks')),
    )
    await assertSucceeds(
      updateDoc(doc(bob, 'multiplayer_games', 'game-acks'), {
        p2: 'bob',
        activePlayer: 'alice',
        status: 'active',
        startedAt,
        lastUpdated: startedAt,
      }),
    )

    const base = activeGame('alice', 'bob', createdAt, startedAt, 'game-acks')
    const ownAck = { round: 1, p1: true, p2: false }
    const bothAcks = { round: 1, p1: true, p2: true }

    await assertFails(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-acks'),
        {
          ...base,
          roundAcks: bothAcks,
          lastUpdated: Timestamp.fromDate(new Date('2026-04-03T00:00:00Z')),
        },
        { merge: true },
      ),
    )
    await assertSucceeds(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-acks'),
        {
          ...base,
          roundAcks: ownAck,
          lastUpdated: Timestamp.fromDate(new Date('2026-04-03T00:00:00Z')),
        },
        { merge: true },
      ),
    )
    await assertFails(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-acks'),
        {
          ...base,
          roundAcks: null,
          lastUpdated: Timestamp.fromDate(new Date('2026-04-04T00:00:00Z')),
        },
        { merge: true },
      ),
    )
    await assertSucceeds(
      setDoc(
        doc(bob, 'multiplayer_games', 'game-acks'),
        {
          ...base,
          roundAcks: bothAcks,
          lastUpdated: Timestamp.fromDate(new Date('2026-04-04T00:00:00Z')),
        },
        { merge: true },
      ),
    )
    await assertSucceeds(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-acks'),
        {
          ...base,
          roundAcks: null,
          gameState: gameState('game-acks', 9),
          lastUpdated: Timestamp.fromDate(new Date('2026-04-05T00:00:00Z')),
        },
        { merge: true },
      ),
    )
  })

  it('allows acks, a dealt rematch, forfeit, and leaving a waiting game', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const bob = testEnv.authenticatedContext('bob').firestore()
    const createdAt = Timestamp.fromDate(new Date('2026-04-01T00:00:00Z'))
    const startedAt = Timestamp.fromDate(new Date('2026-04-02T00:00:00Z'))
    const later = Timestamp.fromDate(new Date('2026-04-03T00:00:00Z'))

    await assertSucceeds(setDoc(doc(alice, 'multiplayer_games', 'game-1'), waitingGame('alice')))
    await assertSucceeds(
      updateDoc(doc(alice, 'multiplayer_games', 'game-1'), {
        status: 'abandoned',
        lastUpdated: later,
      }),
    )

    await assertSucceeds(
      setDoc(doc(alice, 'multiplayer_games', 'game-2'), waitingGame('alice', 'game-2')),
    )
    await assertSucceeds(
      updateDoc(doc(bob, 'multiplayer_games', 'game-2'), {
        p2: 'bob',
        activePlayer: 'bob',
        status: 'active',
        startedAt,
        lastUpdated: startedAt,
      }),
    )

    const seated = {
      ...activeGame('alice', 'bob', createdAt, startedAt, 'game-2'),
      activePlayer: 'bob',
    }

    await assertSucceeds(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-2'),
        {
          ...seated,
          roundAcks: { round: 1, p1: true, p2: false },
          lastUpdated: later,
        },
        { merge: true },
      ),
    )
    await assertFails(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-2'),
        {
          ...seated,
          roundAcks: { round: 1, p1: true, p2: true },
          lastUpdated: later,
        },
        { merge: true },
      ),
    )
    await assertSucceeds(
      setDoc(
        doc(bob, 'multiplayer_games', 'game-2'),
        {
          ...seated,
          roundAcks: { round: 1, p1: true, p2: true },
          lastUpdated: Timestamp.fromDate(new Date('2026-04-04T00:00:00Z')),
        },
        { merge: true },
      ),
    )

    await assertFails(
      setDoc(
        doc(alice, 'multiplayer_games', 'game-2'),
        {
          ...seated,
          roundAcks: { round: 1, p1: true, p2: true },
          gameState: gameState('game-2', 9),
          lastUpdated: Timestamp.fromDate(new Date('2026-04-05T00:00:00Z')),
        },
        { merge: true },
      ),
    )
    const dealt = {
      ...seated,
      roundAcks: null,
      activePlayer: 'alice',
      gameState: gameState('game-2', 9),
      lastUpdated: Timestamp.fromDate(new Date('2026-04-05T00:00:00Z')),
    }
    await assertSucceeds(setDoc(doc(alice, 'multiplayer_games', 'game-2'), dealt, { merge: true }))

    await assertSucceeds(
      setDoc(
        doc(bob, 'multiplayer_games', 'game-2'),
        {
          ...dealt,
          status: 'abandoned',
          terminalStatus: 'abandoned',
          forfeitedBy: 'bob',
          forfeitReason: 'forfeit',
          lastUpdated: Timestamp.fromDate(new Date('2026-04-06T00:00:00Z')),
        },
        { merge: true },
      ),
    )
  })
})

function validFeedback() {
  return {
    ratings: { animation: 4, controls: 5, image: 3, audio: 2 },
    comments: { tag: 'idea', message: 'The cranes are lovely.' },
    submitted_at: Timestamp.fromDate(new Date('2026-04-01T00:00:00Z')),
    submitted_by: 'alice',
  }
}

function validMpFeedback(uid: string) {
  return {
    rating: 5,
    comments: { tag: 'error', message: 'The invite code field jumped.' },
    submitted_at: Timestamp.fromDate(new Date('2026-04-01T00:00:00Z')),
    submitted_by: uid,
  }
}

function validImpression(uid: string, announcementId: string) {
  return {
    uid,
    announcementId,
    views: 1,
    liked: false,
    updatedAt: Timestamp.fromDate(new Date('2026-04-01T00:00:00Z')),
  }
}

function gameState(gameId: string, timestamp = 1_700_000_000_000) {
  return {
    version: '1.0.0',
    timestamp,
    gameId,
    cards: 'encrypted-cards',
    gameData: '{"round":1}',
    players: '{"bonus":1}',
    config: '{"rounds":3}',
  }
}

function waitingGame(hostUid: string, id = 'game-1') {
  const createdAt = Timestamp.fromDate(new Date('2026-04-01T00:00:00Z'))
  return {
    gameId: id,
    gameState: gameState(id),
    mode: 'multiplayer',
    p1: hostUid,
    p2: '',
    activePlayer: hostUid,
    status: 'waiting',
    roundAcks: null,
    finalSeen: { p1: false, p2: false },
    terminalStatus: null,
    inviteCode: 'ABC-123',
    matchRules: { rounds: 3, viewings: 'allow', double: false, wild: false },
    createdAt,
    lastUpdated: createdAt,
    startedAt: null,
  }
}

function activeGame(
  p1: string,
  p2: string,
  createdAt: Timestamp,
  startedAt: Timestamp,
  id = 'game-1',
) {
  return {
    gameId: id,
    gameState: gameState(id),
    mode: 'multiplayer',
    p1,
    p2,
    activePlayer: p1,
    status: 'active',
    roundAcks: null,
    finalSeen: { p1: false, p2: false },
    terminalStatus: null,
    inviteCode: 'ABC-123',
    matchRules: { rounds: 3, viewings: 'allow', double: false, wild: false },
    createdAt,
    lastUpdated: startedAt,
    startedAt,
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
