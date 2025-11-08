import { it, describe, expect, beforeEach } from 'vitest'
import {
  getDefaultStats,
  verifyStatsIntegrity,
  createTamperProofStats,
  updateStats,
  incrementStat,
  decrementStat,
  updateStatsWithOps,
  mergePlayerStats,
  type PlayerStats,
  PLAYER_STATS_KEYS,
} from '../stats'

describe('getDefaultStats', () => {
  it('should create stats with all keys initialized to 0', async () => {
    const stats = await getDefaultStats()

    PLAYER_STATS_KEYS.forEach((key) => {
      expect(stats[key]).toBe(0)
    })
  })

  it('should have metadata with timestamps', async () => {
    const stats = await getDefaultStats()

    expect(stats._meta.createdAt).toBeInstanceOf(Date)
    expect(stats._meta.updatedAt).toBeInstanceOf(Date)
    expect(stats._meta.alg).toBe('sha256')
  })

  it('should have a valid hash', async () => {
    const stats = await getDefaultStats()

    expect(stats._meta.hash).toBeTruthy()
    expect(typeof stats._meta.hash).toBe('string')
    expect(stats._meta.hash.length).toBe(64) // SHA-256 produces 64 hex characters
  })

  it('should create stats that pass integrity verification', async () => {
    const stats = await getDefaultStats()
    const isValid = await verifyStatsIntegrity(stats)

    expect(isValid).toBe(true)
  })
})

describe('verifyStatsIntegrity', () => {
  let validStats: PlayerStats

  beforeEach(async () => {
    validStats = await getDefaultStats()
  })

  it('should verify valid stats as true', async () => {
    const isValid = await verifyStatsIntegrity(validStats)
    expect(isValid).toBe(true)
  })

  it('should detect tampered stat values', async () => {
    const tamperedStats = {
      ...validStats,
      totalYakuCompleted: 999, // Tampered value
    }

    const isValid = await verifyStatsIntegrity(tamperedStats)
    expect(isValid).toBe(false)
  })

  it('should detect tampered metadata timestamps', async () => {
    const tamperedStats = {
      ...validStats,
      _meta: {
        ...validStats._meta,
        updatedAt: new Date('2099-01-01'), // Tampered timestamp
      },
    }

    const isValid = await verifyStatsIntegrity(tamperedStats)
    expect(isValid).toBe(false)
  })

  it('should detect tampered hash', async () => {
    const tamperedStats = {
      ...validStats,
      _meta: {
        ...validStats._meta,
        hash: 'a'.repeat(64), // Invalid hash
      },
    }

    const isValid = await verifyStatsIntegrity(tamperedStats)
    expect(isValid).toBe(false)
  })

  it('should handle unknown hash algorithm', async () => {
    const invalidStats = {
      ...validStats,
      _meta: {
        ...validStats._meta,
        alg: 'md5' as any, // Unsupported algorithm
      },
    }

    const isValid = await verifyStatsIntegrity(invalidStats)
    expect(isValid).toBe(false)
  })
})

describe('createTamperProofStats', () => {
  it('should generate a hash for stats', async () => {
    const stats = await getDefaultStats()
    const oldHash = stats._meta.hash

    // Manually change a value
    const modifiedStats = {
      ...stats,
      totalYakuCompleted: 5,
      _meta: {
        ...stats._meta,
        hash: '', // Clear hash
      },
    }

    const newStats = await createTamperProofStats(modifiedStats)

    expect(newStats._meta.hash).toBeTruthy()
    expect(newStats._meta.hash).not.toBe(oldHash)
    expect(newStats._meta.alg).toBe('sha256')
  })

  it('should create verifiable stats', async () => {
    const stats = await getDefaultStats()
    const modifiedStats = {
      ...stats,
      totalYakuCompleted: 10,
      _meta: {
        ...stats._meta,
        hash: '',
      },
    }

    const tamperProofStats = await createTamperProofStats(modifiedStats)
    const isValid = await verifyStatsIntegrity(tamperProofStats)

    expect(isValid).toBe(true)
  })
})

describe('updateStats', () => {
  let baseStats: PlayerStats

  beforeEach(async () => {
    baseStats = await getDefaultStats()
  })

  it('should update stat values and maintain integrity', async () => {
    const updated = await updateStats(baseStats, {
      totalYakuCompleted: 5,
      yakuCompleted_gokou: 1,
    })

    expect(updated.totalYakuCompleted).toBe(5)
    expect(updated.yakuCompleted_gokou).toBe(1)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })

  it('should update the updatedAt timestamp', async () => {
    const oldTimestamp = baseStats._meta.updatedAt

    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10))

    const updated = await updateStats(baseStats, {
      totalYakuCompleted: 1,
    })

    expect(updated._meta.updatedAt.getTime()).toBeGreaterThan(oldTimestamp.getTime())
  })

  it('should preserve createdAt timestamp', async () => {
    const oldCreatedAt = baseStats._meta.createdAt

    const updated = await updateStats(baseStats, {
      totalYakuCompleted: 1,
    })

    expect(updated._meta.createdAt).toEqual(oldCreatedAt)
  })

  it('should regenerate hash after update', async () => {
    const oldHash = baseStats._meta.hash

    const updated = await updateStats(baseStats, {
      totalYakuCompleted: 1,
    })

    expect(updated._meta.hash).not.toBe(oldHash)
  })

  it('should allow updating metadata fields', async () => {
    const resetDate = new Date('2025-01-01')

    const updated = await updateStats(baseStats, {
      _meta: {
        ...baseStats._meta,
        resetsAt: resetDate,
      },
    })

    expect(updated._meta.resetsAt).toEqual(resetDate)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })
})

describe('incrementStat', () => {
  let baseStats: PlayerStats

  beforeEach(async () => {
    baseStats = await getDefaultStats()
  })

  it('should increment stat by 1 by default', async () => {
    const updated = await incrementStat(baseStats, 'totalYakuCompleted')

    expect(updated.totalYakuCompleted).toBe(1)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })

  it('should increment stat by specified value', async () => {
    const updated = await incrementStat(baseStats, 'totalCardsCaptured', 5)

    expect(updated.totalCardsCaptured).toBe(5)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })

  it('should work with multiple increments', async () => {
    let stats = baseStats

    stats = await incrementStat(stats, 'roundsPlayed_win')
    stats = await incrementStat(stats, 'roundsPlayed_win')
    stats = await incrementStat(stats, 'roundsPlayed_win')

    expect(stats.roundsPlayed_win).toBe(3)

    const isValid = await verifyStatsIntegrity(stats)
    expect(isValid).toBe(true)
  })
})

describe('decrementStat', () => {
  let baseStats: PlayerStats

  beforeEach(async () => {
    baseStats = await getDefaultStats()
    baseStats = await updateStats(baseStats, {
      totalYakuCompleted: 10,
    })
  })

  it('should decrement stat by 1 by default', async () => {
    const updated = await decrementStat(baseStats, 'totalYakuCompleted')

    expect(updated.totalYakuCompleted).toBe(9)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })

  it('should decrement stat by specified value', async () => {
    const updated = await decrementStat(baseStats, 'totalYakuCompleted', 3)

    expect(updated.totalYakuCompleted).toBe(7)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })

  it('should not go below 0', async () => {
    const updated = await decrementStat(baseStats, 'totalYakuCompleted', 20)

    expect(updated.totalYakuCompleted).toBe(0)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })
})

describe('updateStatsWithOps', () => {
  let baseStats: PlayerStats

  beforeEach(async () => {
    baseStats = await getDefaultStats()
    baseStats = await updateStats(baseStats, {
      totalYakuCompleted: 5,
      yakuCompleted_gokou: 1,
      roundsPlayed_win: 10,
    })
  })

  it('should handle increment operations', async () => {
    const updated = await updateStatsWithOps(baseStats, [
      { key: 'totalYakuCompleted', op: 'increment', value: 3 },
      { key: 'yakuCompleted_gokou', op: 'increment', value: 1 },
    ])

    expect(updated.totalYakuCompleted).toBe(8)
    expect(updated.yakuCompleted_gokou).toBe(2)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })

  it('should handle decrement operations', async () => {
    const updated = await updateStatsWithOps(baseStats, [
      { key: 'totalYakuCompleted', op: 'decrement', value: 2 },
      { key: 'roundsPlayed_win', op: 'decrement', value: 5 },
    ])

    expect(updated.totalYakuCompleted).toBe(3)
    expect(updated.roundsPlayed_win).toBe(5)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })

  it('should handle set operations', async () => {
    const updated = await updateStatsWithOps(baseStats, [
      { key: 'totalYakuCompleted', op: 'set', value: 100 },
      { key: 'roundsPlayed_win', op: 'set', value: 50 },
    ])

    expect(updated.totalYakuCompleted).toBe(100)
    expect(updated.roundsPlayed_win).toBe(50)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })

  it('should handle mixed operations', async () => {
    const updated = await updateStatsWithOps(baseStats, [
      { key: 'totalYakuCompleted', op: 'increment', value: 5 },
      { key: 'yakuCompleted_gokou', op: 'decrement', value: 1 },
      { key: 'roundsPlayed_win', op: 'set', value: 25 },
    ])

    expect(updated.totalYakuCompleted).toBe(10)
    expect(updated.yakuCompleted_gokou).toBe(0)
    expect(updated.roundsPlayed_win).toBe(25)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })

  it('should prevent decrement below 0', async () => {
    const updated = await updateStatsWithOps(baseStats, [
      { key: 'yakuCompleted_gokou', op: 'decrement', value: 10 },
    ])

    expect(updated.yakuCompleted_gokou).toBe(0)

    const isValid = await verifyStatsIntegrity(updated)
    expect(isValid).toBe(true)
  })

  it('should be more efficient than multiple individual updates', async () => {
    // This test verifies that we only generate the hash once
    const startTime = performance.now()

    await updateStatsWithOps(baseStats, [
      { key: 'totalYakuCompleted', op: 'increment', value: 1 },
      { key: 'yakuCompleted_gokou', op: 'increment', value: 1 },
      { key: 'yakuCompleted_shikou', op: 'increment', value: 1 },
      { key: 'yakuCompleted_sankou', op: 'increment', value: 1 },
    ])

    const batchTime = performance.now() - startTime

    const startTime2 = performance.now()

    let stats = baseStats
    stats = await incrementStat(stats, 'totalYakuCompleted')
    stats = await incrementStat(stats, 'yakuCompleted_gokou')
    stats = await incrementStat(stats, 'yakuCompleted_shikou')
    stats = await incrementStat(stats, 'yakuCompleted_sankou')

    const individualTime = performance.now() - startTime2

    // Batch operation should be faster (or at least not significantly slower)
    // This is a soft check as performance can vary
    expect(batchTime).toBeLessThanOrEqual(individualTime * 1.5)
  })
})

describe('Hash consistency', () => {
  it('should produce same hash for same data regardless of object creation', async () => {
    const stats1 = await getDefaultStats()
    const stats2 = await getDefaultStats()

    // Set all values to be identical
    const commonData = {
      totalYakuCompleted: 10,
      yakuCompleted_gokou: 1,
      _meta: {
        ...stats1._meta,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    }

    const updated1 = await updateStats(stats1, commonData)
    const updated2 = await updateStats(stats2, commonData)

    expect(updated1._meta.hash).toBe(updated2._meta.hash)
  })

  it('should produce different hash for different data', async () => {
    const stats = await getDefaultStats()

    const updated1 = await updateStats(stats, { totalYakuCompleted: 5 })
    const updated2 = await updateStats(stats, { totalYakuCompleted: 10 })

    expect(updated1._meta.hash).not.toBe(updated2._meta.hash)
  })

  it('should handle Date objects and ISO strings consistently', async () => {
    const stats = await getDefaultStats()
    const date = new Date('2025-01-01T00:00:00.000Z')

    // Create two identical stats objects with the same base data
    const baseStats1 = await updateStats(stats, {
      _meta: {
        ...stats._meta,
        updatedAt: new Date('2025-01-01T00:00:00.000Z'), // Normalize timestamp
      },
    })

    const baseStats2 = await updateStats(stats, {
      _meta: {
        ...stats._meta,
        updatedAt: new Date('2025-01-01T00:00:00.000Z'), // Normalize timestamp
      },
    })

    const updated1 = await updateStats(baseStats1, {
      _meta: {
        ...baseStats1._meta,
        resetsAt: date,
      },
    })

    const updated2 = await updateStats(baseStats2, {
      _meta: {
        ...baseStats2._meta,
        resetsAt: new Date(date.toISOString()),
      },
    })

    expect(updated1._meta.hash).toBe(updated2._meta.hash)
  })
})

describe('mergePlayerStats', () => {
  let stats1: PlayerStats
  let stats2: PlayerStats

  beforeEach(async () => {
    // Create first stats with some values
    stats1 = await getDefaultStats()
    stats1 = await updateStats(stats1, {
      totalYakuCompleted: 5,
      yakuCompleted_gokou: 2,
      roundsPlayed_win: 3,
      cardsCaptured_bright: 10,
      _meta: {
        ...stats1._meta,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-05T00:00:00.000Z'),
      },
    })

    // Create second stats with different values
    stats2 = await getDefaultStats()
    stats2 = await updateStats(stats2, {
      totalYakuCompleted: 3,
      yakuCompleted_shikou: 1,
      roundsPlayed_win: 2,
      cardsCaptured_animal: 8,
      _meta: {
        ...stats2._meta,
        createdAt: new Date('2025-01-02T00:00:00.000Z'),
        updatedAt: new Date('2025-01-10T00:00:00.000Z'),
      },
    })
  })

  it('should add numeric stats together', async () => {
    const merged = await mergePlayerStats(stats1, stats2)

    expect(merged.totalYakuCompleted).toBe(8) // 5 + 3
    expect(merged.yakuCompleted_gokou).toBe(2) // 2 + 0
    expect(merged.yakuCompleted_shikou).toBe(1) // 0 + 1
    expect(merged.roundsPlayed_win).toBe(5) // 3 + 2
    expect(merged.cardsCaptured_bright).toBe(10) // 10 + 0
    expect(merged.cardsCaptured_animal).toBe(8) // 0 + 8
  })

  it('should use earliest createdAt', async () => {
    const merged = await mergePlayerStats(stats1, stats2)

    expect(merged._meta.createdAt).toEqual(new Date('2025-01-01T00:00:00.000Z'))
  })

  it('should use latest updatedAt', async () => {
    const merged = await mergePlayerStats(stats1, stats2)

    expect(merged._meta.updatedAt).toEqual(new Date('2025-01-10T00:00:00.000Z'))
  })

  it('should preserve all stat keys with zero values', async () => {
    const merged = await mergePlayerStats(stats1, stats2)

    PLAYER_STATS_KEYS.forEach((key) => {
      expect(typeof merged[key]).toBe('number')
      expect(merged[key]).toBeGreaterThanOrEqual(0)
    })
  })

  it('should regenerate hash and maintain integrity', async () => {
    const merged = await mergePlayerStats(stats1, stats2)

    expect(merged._meta.hash).toBeTruthy()
    expect(merged._meta.hash).not.toBe(stats1._meta.hash)
    expect(merged._meta.hash).not.toBe(stats2._meta.hash)
    expect(merged._meta.alg).toBe('sha256')

    const isValid = await verifyStatsIntegrity(merged)
    expect(isValid).toBe(true)
  })

  it('should handle lastSyncAt merging', async () => {
    const stats1WithSync = await updateStats(stats1, {
      _meta: {
        ...stats1._meta,
        lastSyncAt: new Date('2025-01-03T00:00:00.000Z'),
      },
    })

    const stats2WithSync = await updateStats(stats2, {
      _meta: {
        ...stats2._meta,
        lastSyncAt: new Date('2025-01-08T00:00:00.000Z'),
      },
    })

    const merged = await mergePlayerStats(stats1WithSync, stats2WithSync)

    expect(merged._meta.lastSyncAt).toEqual(new Date('2025-01-08T00:00:00.000Z'))
  })

  it('should handle lastSyncAt when only one has it', async () => {
    const stats1WithSync = await updateStats(stats1, {
      _meta: {
        ...stats1._meta,
        lastSyncAt: new Date('2025-01-03T00:00:00.000Z'),
      },
    })

    const merged = await mergePlayerStats(stats1WithSync, stats2)

    expect(merged._meta.lastSyncAt).toEqual(new Date('2025-01-03T00:00:00.000Z'))
  })

  it('should handle resetsAt merging', async () => {
    const stats1WithReset = await updateStats(stats1, {
      _meta: {
        ...stats1._meta,
        resetsAt: new Date('2025-02-01T00:00:00.000Z'),
      },
    })

    const stats2WithReset = await updateStats(stats2, {
      _meta: {
        ...stats2._meta,
        resetsAt: new Date('2025-03-01T00:00:00.000Z'),
      },
    })

    const merged = await mergePlayerStats(stats1WithReset, stats2WithReset)

    expect(merged._meta.resetsAt).toEqual(new Date('2025-03-01T00:00:00.000Z'))
  })

  it('should handle stats with zeros correctly', async () => {
    const emptyStats = await getDefaultStats()

    const merged = await mergePlayerStats(stats1, emptyStats)

    // All stats1 values should be preserved
    expect(merged.totalYakuCompleted).toBe(5)
    expect(merged.yakuCompleted_gokou).toBe(2)
    expect(merged.roundsPlayed_win).toBe(3)
  })

  it('should be commutative (order should not matter for numeric stats)', async () => {
    const merged1 = await mergePlayerStats(stats1, stats2)
    const merged2 = await mergePlayerStats(stats2, stats1)

    // Numeric stats should be the same regardless of order
    PLAYER_STATS_KEYS.forEach((key) => {
      expect(merged1[key]).toBe(merged2[key])
    })

    // Metadata might differ (timestamps), but numeric values should match
    expect(merged1.totalYakuCompleted).toBe(merged2.totalYakuCompleted)
    expect(merged1.roundsPlayed_win).toBe(merged2.roundsPlayed_win)
  })

  it('should handle merging same stats object with itself', async () => {
    const merged = await mergePlayerStats(stats1, stats1)

    // All values should be doubled
    expect(merged.totalYakuCompleted).toBe(10) // 5 * 2
    expect(merged.yakuCompleted_gokou).toBe(4) // 2 * 2
    expect(merged.roundsPlayed_win).toBe(6) // 3 * 2

    const isValid = await verifyStatsIntegrity(merged)
    expect(isValid).toBe(true)
  })
})
