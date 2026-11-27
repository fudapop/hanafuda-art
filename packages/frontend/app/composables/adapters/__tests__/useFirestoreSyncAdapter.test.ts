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
  const oldAvatar =
    'https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/avatars/flat-crane.webp'
  const avatar = 'https://assets.fudapop.com/avatars/flat-crane.webp'
  beforeEach(() => {
    batch.set.mockClear()
    batch.commit.mockClear()
    batch.commit.mockResolvedValue(undefined)
  })

  it('step 3: pull and subscription resolve saved avatars without writing or changing profile data', async () => {
    const { getDoc, onSnapshot } = await import('firebase/firestore')
    const { createDefaultProfile } = await import('~/utils/profile')
    const { useFirestoreSyncAdapter } = await import('../useFirestoreSyncAdapter')
    const saved = {
      ...(await createDefaultProfile(
        { uid: 'saved', lastUpdated: new Date('2025-01-01') },
        avatar,
      )),
      avatar: oldAvatar,
    }
    const snapshot = { exists: () => true, data: () => saved } as any
    vi.mocked(getDoc).mockResolvedValueOnce(snapshot)
    const adapter = useFirestoreSyncAdapter()
    expect(await adapter.pull(saved.uid)).toEqual({ ...saved, avatar })
    const callback = vi.fn()
    adapter.subscribe!(saved.uid, callback)
    const onValue = vi.mocked(onSnapshot).mock.calls.at(-1)![1] as (value: any) => Promise<void>
    await onValue(snapshot)
    expect(callback).toHaveBeenCalledExactlyOnceWith({ ...saved, avatar })
    expect(batch.set).not.toHaveBeenCalled()
    expect(batch.commit).not.toHaveBeenCalled()
    expect(saved.avatar).toBe(oldAvatar)
  })

  it('step 3: one ordinary batch writes equal canonical private/public avatars with the original timestamp', async () => {
    const { createDefaultProfile, sanitizeProfile } = await import('~/utils/profile')
    const { useFirestoreSyncAdapter } = await import('../useFirestoreSyncAdapter')
    const saved = {
      ...(await createDefaultProfile(
        { uid: 'saved', lastUpdated: new Date('2025-01-01') },
        avatar,
      )),
      avatar: oldAvatar,
    }
    expect(await useFirestoreSyncAdapter().push(saved)).toBe(true)
    const privateData = batch.set.mock.calls[0]![1]
    const publicData = batch.set.mock.calls[1]![1]
    expect(privateData.avatar).toBe(sanitizeProfile(saved).avatar)
    expect(publicData.avatar).toBe(privateData.avatar)
    expect(privateData.avatar).toBe(avatar)
    expect(privateData.lastUpdated.toDate()).toEqual(saved.lastUpdated)
    expect(publicData.lastUpdated.toDate()).toEqual(saved.lastUpdated)
    expect(privateData.record).toEqual(saved.record)
    expect(privateData.stats).toEqual(saved.stats)
    expect(privateData.designs).toEqual(saved.designs)
    expect(batch.set).toHaveBeenCalledTimes(2)
    expect(batch.commit).toHaveBeenCalledOnce()
    expect(saved.avatar).toBe(oldAvatar)
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
