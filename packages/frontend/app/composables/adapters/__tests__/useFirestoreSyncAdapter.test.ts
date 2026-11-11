import { beforeEach, describe, expect, it, vi } from 'vitest'

const batch = vi.hoisted(() => {
  const set = vi.fn()
  const commit = vi.fn().mockResolvedValue(undefined)
  return { set, commit }
})

vi.mock('firebase/firestore', () => ({
  deleteField: vi.fn(() => ({ sentinel: 'delete' })),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  getFirestore: vi.fn(() => ({ name: 'test-db' })),
  onSnapshot: vi.fn(),
  Timestamp: { fromDate: (date: Date) => ({ toDate: () => date }) },
  writeBatch: vi.fn(() => batch),
}))

describe('useFirestoreSyncAdapter', () => {
  beforeEach(() => {
    batch.set.mockClear()
    batch.commit.mockClear()
    batch.commit.mockResolvedValue(undefined)
  })

  it('keeps the local email when the remote profile is newer and has none', async () => {
    const { createDefaultProfile } = await import('~/utils/profile')
    const { useFirestoreSyncAdapter } = await import('../useFirestoreSyncAdapter')
    const local = await createDefaultProfile(
      {
        uid: 'user-1',
        email: 'local@test.com',
        username: 'LocalUser',
        lastUpdated: new Date('2025-01-01T00:00:00Z'),
      },
      '/avatars/flat-crane.webp',
    )
    const remote = {
      ...local,
      email: '',
      username: 'RemoteUser',
      lastUpdated: new Date('2025-01-02T00:00:00Z'),
    }

    const resolved = await useFirestoreSyncAdapter().resolve!(local, remote)

    expect(resolved.email).toBe('local@test.com')
    expect(resolved.username).toBe('RemoteUser')
  })

  it('commits the private profile and public leaderboard entry in one batch', async () => {
    const { createDefaultProfile } = await import('~/utils/profile')
    const { useFirestoreSyncAdapter } = await import('../useFirestoreSyncAdapter')
    const profile = await createDefaultProfile(
      {
        uid: 'user-1',
        email: 'local@test.com',
        username: 'LocalUser',
        record: { coins: 100, win: 2, loss: 1, draw: 0 },
        lastUpdated: new Date('2025-01-01T00:00:00Z'),
      },
      '/avatars/flat-crane.webp',
    )

    const success = await useFirestoreSyncAdapter().push(profile)

    expect(success).toBe(true)
    expect(batch.commit).toHaveBeenCalledOnce()
    expect(batch.set).toHaveBeenCalledTimes(2)
    expect(batch.set.mock.calls[0]?.[0]).toEqual({ collection: 'users', id: 'u_user-1' })
    expect(batch.set.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ uid: 'user-1' }))
    expect(batch.set.mock.calls[0]?.[2]).toEqual({ merge: true })
    expect(batch.set.mock.calls[1]?.[0]).toEqual({ collection: 'leaderboard', id: 'user-1' })
    expect(batch.set.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ uid: 'user-1', hasGames: true }),
    )
  })

  it('returns false without committing when the batch fails', async () => {
    const { createDefaultProfile } = await import('~/utils/profile')
    const { useFirestoreSyncAdapter } = await import('../useFirestoreSyncAdapter')
    const profile = await createDefaultProfile(
      { uid: 'user-1', email: 'local@test.com', username: 'LocalUser' },
      '/avatars/flat-crane.webp',
    )
    batch.commit.mockRejectedValueOnce(new Error('offline'))

    await expect(useFirestoreSyncAdapter().push(profile)).resolves.toBe(false)
  })
})
