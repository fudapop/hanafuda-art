import { describe, it, expect } from 'vitest'
import {
  resolveConflict,
  shouldSync,
  createSyncResult,
  shouldUseRemote,
  type ConflictResolution,
} from '../sync'
import { getDefaultStats } from '../stats'
import type { PlayerProfile } from '~/types/profile'

// Helper to create a mock profile with valid stats
const createMockProfile = async (
  overrides: Partial<PlayerProfile> = {},
): Promise<PlayerProfile> => ({
  uid: 'test-uid',
  username: 'TestUser',
  email: 'test@example.com',
  avatar: 'avatar.webp',
  record: { coins: 500, win: 10, loss: 5, draw: 2 },
  lastUpdated: new Date('2025-01-01'),
  // @ts-expect-error for testing
  designs: { unlocked: ['design1'], liked: ['design2'] },
  settings: {},
  flags: { isNewPlayer: false, hasSubmittedFeedback: true },
  isGuest: false,
  stats: await getDefaultStats(), // Valid stats with hash
  ...overrides,
})

describe('resolveConflict', () => {
  describe('last-write-wins strategy', () => {
    it('should return local when local is newer', async () => {
      const local = await createMockProfile({ lastUpdated: new Date('2025-01-02') })
      const remote = await createMockProfile({ lastUpdated: new Date('2025-01-01') })

      const result = await resolveConflict(local, remote, 'last-write-wins')

      expect(result.resolved).toBe(local)
      expect(result.source).toBe('local')
    })

    it('should return remote when remote is newer', async () => {
      const local = await createMockProfile({ lastUpdated: new Date('2025-01-01') })
      const remote = await createMockProfile({ lastUpdated: new Date('2025-01-02') })

      const result = await resolveConflict(local, remote, 'last-write-wins')

      expect(result.resolved).toBe(remote)
      expect(result.source).toBe('remote')
    })

    it('should return remote when timestamps are equal', async () => {
      const timestamp = new Date('2025-01-01')
      const local = await createMockProfile({ lastUpdated: timestamp })
      const remote = await createMockProfile({ lastUpdated: timestamp })

      const result = await resolveConflict(local, remote, 'last-write-wins')

      expect(result.resolved).toBe(remote)
      expect(result.source).toBe('remote')
    })
  })

  describe('merge-fields strategy', () => {
    it('should take max values for record fields', async () => {
      const local = await createMockProfile({
        record: { coins: 100, win: 10, loss: 2, draw: 1 },
      })
      const remote = await createMockProfile({
        record: { coins: 200, win: 5, loss: 5, draw: 3 },
      })

      const result = await resolveConflict(local, remote, 'merge-fields')

      expect(result.resolved.record).toEqual({
        coins: 200, // max
        win: 10, // max
        loss: 5, // max
        draw: 3, // max
      })
      expect(result.source).toBe('merged')
    })

    it('should merge unlocked designs (union)', async () => {
      const local = await createMockProfile({
        // @ts-expect-error for testing
        designs: { unlocked: ['design1', 'design2'], liked: [] },
      })
      const remote = await createMockProfile({
        // @ts-expect-error for testing
        designs: { unlocked: ['design2', 'design3'], liked: [] },
      })

      const result = await resolveConflict(local, remote, 'merge-fields')

      expect(result.resolved.designs.unlocked).toEqual(
        expect.arrayContaining(['design1', 'design2', 'design3']),
      )
      expect(result.resolved.designs.unlocked).toHaveLength(3)
      expect(result.source).toBe('merged')
    })

    it('should merge liked designs (union)', async () => {
      const local = await createMockProfile({
        // @ts-expect-error for testing
        designs: { unlocked: [], liked: ['liked1', 'liked2'] },
      })
      const remote = await createMockProfile({
        // @ts-expect-error for testing
        designs: { unlocked: [], liked: ['liked2', 'liked3'] },
      })

      const result = await resolveConflict(local, remote, 'merge-fields')

      expect(result.resolved.designs.liked).toEqual(
        expect.arrayContaining(['liked1', 'liked2', 'liked3']),
      )
      expect(result.resolved.designs.liked).toHaveLength(3)
      expect(result.source).toBe('merged')
    })

    it('should take newer timestamp', async () => {
      const newerDate = new Date('2025-01-02')
      const olderDate = new Date('2025-01-01')
      const local = await createMockProfile({ lastUpdated: newerDate })
      const remote = await createMockProfile({ lastUpdated: olderDate })

      const result = await resolveConflict(local, remote, 'merge-fields')

      expect(result.resolved.lastUpdated).toEqual(newerDate)
      expect(result.source).toBe('merged')
    })

    it('should merge stats by adding values together', async () => {
      const { updateStats } = await import('../stats')

      const stats1 = await updateStats(await getDefaultStats(), { totalYakuCompleted: 5 })
      const stats2 = await updateStats(await getDefaultStats(), { totalYakuCompleted: 3 })

      const local = await createMockProfile({
        lastUpdated: new Date('2025-01-02'),
        stats: stats1,
      })
      const remote = await createMockProfile({
        lastUpdated: new Date('2025-01-01'),
        stats: stats2,
      })

      const result = await resolveConflict(local, remote, 'merge-fields')

      // Stats should be merged (added together)
      expect(result.resolved.stats.totalYakuCompleted).toBe(8) // 5 + 3
      expect(result.source).toBe('merged')
    })

    it('should preserve other fields from local', async () => {
      const local = await createMockProfile({
        username: 'LocalUser',
        email: 'local@test.com',
      })
      const remote = await createMockProfile({
        username: 'RemoteUser',
        email: 'remote@test.com',
      })

      const result = await resolveConflict(local, remote, 'merge-fields')

      expect(result.resolved.username).toBe('LocalUser')
      expect(result.resolved.email).toBe('local@test.com')
      expect(result.source).toBe('merged')
    })
  })
})

describe('shouldSync', () => {
  it('should return false for null profile', () => {
    expect(shouldSync(null)).toBe(false)
  })

  it('should return false for guest profile', async () => {
    const guest = await createMockProfile({ isGuest: true })
    expect(shouldSync(guest)).toBe(false)
  })

  it('should return true for authenticated profile', async () => {
    const authenticated = await createMockProfile({ isGuest: false })
    expect(shouldSync(authenticated)).toBe(true)
  })

  it('should return true for profile without isGuest flag', async () => {
    const profile = await createMockProfile({ isGuest: undefined as any })
    expect(shouldSync(profile)).toBe(true)
  })
})

describe('createSyncResult', () => {
  it('should create success result with all fields', async () => {
    const local = await createMockProfile()
    const remote = await createMockProfile({ username: 'Remote' })
    const merged = await createMockProfile({ username: 'Merged' })

    const result = createSyncResult({
      success: true,
      local,
      remote,
      merged,
      action: 'merged',
    })

    expect(result.success).toBe(true)
    expect(result.local).toBe(local)
    expect(result.remote).toBe(remote)
    expect(result.merged).toBe(merged)
    expect(result.action).toBe('merged')
    expect(result.error).toBeUndefined()
  })

  it('should create error result', () => {
    const result = createSyncResult({
      success: false,
      error: 'Sync failed',
      action: 'skipped',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Sync failed')
    expect(result.local).toBeNull()
    expect(result.remote).toBeNull()
    expect(result.merged).toBeUndefined()
    expect(result.action).toBe('skipped')
  })

  it('should handle all action types', () => {
    const actions: Array<'pulled' | 'pushed' | 'merged' | 'skipped'> = [
      'pulled',
      'pushed',
      'merged',
      'skipped',
    ]

    actions.forEach((action) => {
      const result = createSyncResult({ success: true, action })
      expect(result.action).toBe(action)
    })
  })
})

describe('shouldUseRemote', () => {
  it('should return true when remote is newer (last-write-wins)', async () => {
    const local = await createMockProfile({ lastUpdated: new Date('2025-01-01') })
    const remote = await createMockProfile({ lastUpdated: new Date('2025-01-02') })

    expect(await shouldUseRemote(local, remote, 'last-write-wins')).toBe(true)
  })

  it('should return false when local is newer (last-write-wins)', async () => {
    const local = await createMockProfile({ lastUpdated: new Date('2025-01-02') })
    const remote = await createMockProfile({ lastUpdated: new Date('2025-01-01') })

    expect(await shouldUseRemote(local, remote, 'last-write-wins')).toBe(false)
  })

  it('should return false for merge-fields strategy', async () => {
    // merge-fields always creates a new merged object, never returns remote as-is
    const local = await createMockProfile({ lastUpdated: new Date('2025-01-01') })
    const remote = await createMockProfile({ lastUpdated: new Date('2025-01-02') })

    // merge-fields strategy returns source 'merged', not 'remote'
    expect(await shouldUseRemote(local, remote, 'merge-fields')).toBe(false)
  })
})
