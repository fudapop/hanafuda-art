import { describe, expect, it } from 'vitest'
import type { PlayerProfile } from '~/types/profile'
import {
  calculateGameRecord,
  createDefaultProfile,
  getDefaultDesigns,
  hasMissingStatKeys,
  normalizeTimestamp,
  sanitizeFirestoreData,
  sanitizeProfile,
  validatePlayerStats,
} from '../profile'
import { createTamperProofStats, getDefaultStats } from '../stats'

describe('sanitizeProfile', () => {
  it('removes Vue reactivity and creates plain object', () => {
    const profile: PlayerProfile = {
      uid: 'user123',
      email: 'test@example.com',
      avatar: 'avatar.webp',
      username: 'TestUser',
      record: { coins: 500, win: 5, loss: 3, draw: 1 },
      lastUpdated: new Date('2024-01-01'),
      designs: { unlocked: ['cherry-version'], liked: ['flash-black'] },
      settings: { volume: 0.8 },
      flags: { isNewPlayer: false, hasSubmittedFeedback: true },
      isGuest: false,
      stats: {} as any, // Simplified for test
    }

    const sanitized = sanitizeProfile(profile)

    expect(sanitized.uid).toBe('user123')
    expect(sanitized.email).toBe('test@example.com')
    expect(sanitized.record.coins).toBe(500)
    expect(sanitized.designs.unlocked).toEqual(['cherry-version'])
    expect(sanitized.lastUpdated).toBeInstanceOf(Date)
  })

  it('handles Date conversion from string', () => {
    const profile: PlayerProfile = {
      uid: 'user123',
      email: 'test@example.com',
      avatar: 'avatar.webp',
      username: 'TestUser',
      record: { coins: 500, win: 5, loss: 3, draw: 1 },
      lastUpdated: '2024-06-15T10:00:00.000Z' as any, // ISO string date
      designs: { unlocked: ['cherry-version'], liked: [] },
      settings: {},
      flags: { isNewPlayer: false, hasSubmittedFeedback: true },
      stats: {} as any,
    }

    const sanitized = sanitizeProfile(profile)

    expect(sanitized.lastUpdated).toBeInstanceOf(Date)
    expect(sanitized.lastUpdated.getFullYear()).toBe(2024)
    expect(sanitized.lastUpdated.getMonth()).toBe(5) // June
  })

  it('handles missing settings field', () => {
    const profile: PlayerProfile = {
      uid: 'user123',
      email: 'test@example.com',
      avatar: 'avatar.webp',
      username: 'TestUser',
      record: { coins: 500, win: 5, loss: 3, draw: 1 },
      lastUpdated: new Date(),
      designs: { unlocked: ['cherry-version'], liked: [] },
      settings: null as any,
      flags: { isNewPlayer: false, hasSubmittedFeedback: true },
      stats: {} as any,
    }

    const sanitized = sanitizeProfile(profile)

    // validateSettings now returns default settings instead of empty object
    expect(sanitized.settings).toEqual({
      rounds: 3,
      viewings: 'allow',
      double: false,
      wild: false,
      labels: false,
      cardSize: 1.0,
    })
  })
})

describe('validatePlayerStats', () => {
  it('preserves valid stat values after validation', async () => {
    const validStats = await getDefaultStats()
    validStats.totalYakuCompleted = 5
    validStats.yakuCompleted_gokou = 2

    // Need to recreate hash after modifying values
    const statsWithHash = await createTamperProofStats(validStats)

    const validated = await validatePlayerStats(statsWithHash)

    expect(validated.totalYakuCompleted).toBe(5)
    expect(validated.yakuCompleted_gokou).toBe(2)
    expect(validated._meta.hash).toBeTruthy()
  })

  it('resets tampered stats to defaults', async () => {
    const validStats = await getDefaultStats()
    const tamperedStats = {
      ...validStats,
      totalYakuCompleted: 999,
      // Hash no longer matches
    }

    const validated = await validatePlayerStats(tamperedStats)

    // Should be reset to 0
    expect(validated.totalYakuCompleted).toBe(0)
    expect(validated._meta.hash).toBeTruthy()
  })

  it('merges missing stat keys with defaults', async () => {
    const partialStats = await getDefaultStats()
    // Simulate old schema missing a key
    delete (partialStats as any).yakuCompleted_gokou

    // Make it valid so it passes integrity check
    const validPartial = await createTamperProofStats(partialStats)

    const validated = await validatePlayerStats(validPartial)

    // Should have the missing key added
    expect(validated.yakuCompleted_gokou).toBe(0)
    expect(validated._meta.hash).toBeTruthy()
  })
})

describe('createDefaultProfile', () => {
  it('creates profile with default values', async () => {
    const profile = await createDefaultProfile({}, 'default-avatar.webp')

    expect(profile.uid).toBe('unknown')
    expect(profile.avatar).toBe('default-avatar.webp')
    expect(profile.username).toBeTypeOf('string')
    expect(profile.record.coins).toBe(500)
    expect(profile.record.win).toBe(0)
    expect(profile.flags.isNewPlayer).toBe(true)
    expect(profile.stats).toBeDefined()
  })

  it('overrides defaults with provided values', async () => {
    const profile = await createDefaultProfile(
      {
        uid: 'user123',
        username: 'CustomUser',
        record: { coins: 1000, win: 10, loss: 5, draw: 2 },
      },
      'default-avatar.webp',
    )

    expect(profile.uid).toBe('user123')
    expect(profile.username).toBe('CustomUser')
    expect(profile.record.coins).toBe(1000)
    expect(profile.record.win).toBe(10)
  })

  it('uses provided avatar over default', async () => {
    const profile = await createDefaultProfile(
      {
        avatar: 'custom-avatar.webp',
      },
      'default-avatar.webp',
    )

    expect(profile.avatar).toBe('custom-avatar.webp')
  })

  it('includes default designs', async () => {
    const profile = await createDefaultProfile({}, 'default-avatar.webp')

    expect(profile.designs.unlocked).toContain('cherry-version')
    expect(profile.designs.unlocked).toContain('ramen-red')
    expect(profile.designs.unlocked).toContain('flash-black')
    expect(profile.designs.liked).toEqual([])
  })

  it('initializes stats with hash', async () => {
    const profile = await createDefaultProfile({}, 'default-avatar.webp')

    expect(profile.stats).toBeDefined()
    expect(profile.stats._meta.hash).toBeTruthy()
    expect(profile.stats._meta.alg).toBe('sha256')
  })
})

describe('normalizeTimestamp', () => {
  it('returns Date objects unchanged', () => {
    const date = new Date('2024-01-15')
    const normalized = normalizeTimestamp(date)

    expect(normalized).toBeInstanceOf(Date)
    expect(normalized.getTime()).toBe(date.getTime())
  })

  it('converts Firestore Timestamp to Date', () => {
    const firestoreTimestamp = {
      toDate: () => new Date('2024-01-15'),
    }

    const normalized = normalizeTimestamp(firestoreTimestamp)

    expect(normalized).toBeInstanceOf(Date)
    expect(normalized.getFullYear()).toBe(2024)
    expect(normalized.getMonth()).toBe(0)
  })

  it('converts ISO string to Date', () => {
    const isoString = '2024-01-15T10:30:00.000Z'
    const normalized = normalizeTimestamp(isoString)

    expect(normalized).toBeInstanceOf(Date)
    expect(normalized.toISOString()).toBe(isoString)
  })

  it('converts timestamp number to Date', () => {
    const timestamp = 1705318200000 // 2024-01-15
    const normalized = normalizeTimestamp(timestamp)

    expect(normalized).toBeInstanceOf(Date)
    expect(normalized.getTime()).toBe(timestamp)
  })

  it('returns current date for invalid input', () => {
    const normalized = normalizeTimestamp(null)

    expect(normalized).toBeInstanceOf(Date)
    // Should be close to now
    expect(Math.abs(normalized.getTime() - Date.now())).toBeLessThan(1000)
  })
})

describe('sanitizeFirestoreData', () => {
  it('converts Firestore data to profile format', async () => {
    const firestoreData = {
      uid: 'user123',
      email: 'test@example.com',
      avatar: 'avatar.webp',
      username: 'TestUser',
      record: { coins: 1000, win: 10, loss: 5, draw: 2 },
      lastUpdated: { toDate: () => new Date('2024-01-15') },
      designs: { unlocked: ['cherry-version'], liked: [] },
      settings: { volume: 0.5 },
      flags: { isNewPlayer: false, hasSubmittedFeedback: true },
      stats: await getDefaultStats(),
    }

    const profile = await sanitizeFirestoreData(firestoreData, 'user123', 'default-avatar.webp')

    expect(profile.uid).toBe('user123')
    expect(profile.username).toBe('TestUser')
    expect(profile.lastUpdated).toBeInstanceOf(Date)
    expect(profile.lastUpdated.getFullYear()).toBe(2024)
    expect(profile.stats).toBeDefined()
  })

  it('uses provided defaults for missing fields', async () => {
    const minimalData = {}

    const profile = await sanitizeFirestoreData(minimalData, 'user456', 'fallback-avatar.webp')

    expect(profile.uid).toBe('user456')
    expect(profile.avatar).toBe('fallback-avatar.webp')
    expect(profile.username).toBeTypeOf('string')
    expect(profile.record.coins).toBe(500)
    expect(profile.stats).toBeDefined()
  })

  it('validates stats during conversion', async () => {
    const firestoreData = {
      stats: await getDefaultStats(),
    }

    // Tamper with the stats
    firestoreData.stats.totalYakuCompleted = 999

    const profile = await sanitizeFirestoreData(firestoreData, 'user123', 'avatar.webp')

    // Stats should be reset due to failed validation
    expect(profile.stats.totalYakuCompleted).toBe(0)
  })
})

describe('calculateGameRecord', () => {
  it('increments win count and adds coins', () => {
    const currentRecord = { coins: 500, win: 5, loss: 3, draw: 1 }

    const newRecord = calculateGameRecord(currentRecord, 'win', 100)

    expect(newRecord.win).toBe(6)
    expect(newRecord.loss).toBe(3)
    expect(newRecord.draw).toBe(1)
    expect(newRecord.coins).toBe(600)
  })

  it('increments loss count and subtracts coins', () => {
    const currentRecord = { coins: 500, win: 5, loss: 3, draw: 1 }

    const newRecord = calculateGameRecord(currentRecord, 'loss', -50)

    expect(newRecord.win).toBe(5)
    expect(newRecord.loss).toBe(4)
    expect(newRecord.draw).toBe(1)
    expect(newRecord.coins).toBe(450)
  })

  it('increments draw count without coin change', () => {
    const currentRecord = { coins: 500, win: 5, loss: 3, draw: 1 }

    const newRecord = calculateGameRecord(currentRecord, 'draw', 0)

    expect(newRecord.win).toBe(5)
    expect(newRecord.loss).toBe(3)
    expect(newRecord.draw).toBe(2)
    expect(newRecord.coins).toBe(500)
  })

  it('handles large coin amounts', () => {
    const currentRecord = { coins: 1000, win: 0, loss: 0, draw: 0 }

    const newRecord = calculateGameRecord(currentRecord, 'win', 9999)

    expect(newRecord.coins).toBe(10999)
  })

  it('handles negative coin balance', () => {
    const currentRecord = { coins: 100, win: 0, loss: 0, draw: 0 }

    const newRecord = calculateGameRecord(currentRecord, 'loss', -200)

    expect(newRecord.coins).toBe(-100)
  })
})

describe('hasMissingStatKeys', () => {
  it('returns false for complete stats', async () => {
    const completeStats = await getDefaultStats()

    const hasMissing = await hasMissingStatKeys(completeStats)

    expect(hasMissing).toBe(false)
  })

  it('returns true for stats missing keys', async () => {
    const incompleteStats = await getDefaultStats()
    delete (incompleteStats as any).yakuCompleted_gokou
    delete (incompleteStats as any).totalYakuCompleted

    const hasMissing = await hasMissingStatKeys(incompleteStats)

    expect(hasMissing).toBe(true)
  })

  it('ignores _meta field in comparison', async () => {
    const stats = await getDefaultStats()
    // Modify meta but keep all stat keys
    stats._meta.updatedAt = new Date('2020-01-01')

    const hasMissing = await hasMissingStatKeys(stats)

    expect(hasMissing).toBe(false)
  })
})

describe('getDefaultDesigns', () => {
  it('returns array of default design IDs', () => {
    const designs = getDefaultDesigns()

    expect(Array.isArray(designs)).toBe(true)
    expect(designs.length).toBeGreaterThan(0)
    expect(designs).toContain('cherry-version')
    expect(designs).toContain('ramen-red')
    expect(designs).toContain('flash-black')
  })

  it('returns consistent results on multiple calls', () => {
    const designs1 = getDefaultDesigns()
    const designs2 = getDefaultDesigns()

    expect(designs1).toEqual(designs2)
    expect(designs1.length).toBe(designs2.length)
  })
})
