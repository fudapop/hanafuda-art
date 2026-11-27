import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayerProfile, SyncAdapter } from '~~/types/profile'
import { createDefaultProfile, sanitizeFirestoreData, sanitizeProfile } from '~/utils/profile'
import { resolveConflict } from '~/utils/sync'
import { buildLeaderboardEntry, readLeaderboardEntry } from '~/utils/leaderboard'
import { createLocalGuestProfile, usePlayerProfile } from '~/composables/usePlayerProfile'

const db = vi.hoisted(() => {
  const rows = new Map<string, any>()
  const meta = new Map<string, any>()
  const writes = vi.fn(async (id: string, data: any) => {
    rows.set(id, data)
  })
  return { rows, meta, writes }
})
vi.mock('dexbee-js', () => ({ eq: (_key: string, id: string) => id }))
vi.mock('~/composables/useDexBee', () => ({
  getDexBeeDb: async () => ({
    table: (name: string) =>
      name === 'syncMetadata'
        ? {
            where: (id: string) => ({ first: async () => db.meta.get(id) ?? null }),
            insert: async (data: any) => {
              db.meta.set(data.uid, data)
            },
            update: async (id: string, data: any) => {
              db.meta.set(id, data)
            },
          }
        : {
            where: (id: string) => ({ first: async () => db.rows.get(id) ?? null }),
            insert: (data: any) => db.writes(data.uid, data),
            update: db.writes,
            delete: async (id: string) => {
              db.rows.delete(id)
            },
          },
  }),
}))

const oldAvatar =
  'https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/avatars/flat-crane.webp?v=old'
const avatar = 'https://assets.fudapop.com/avatars/flat-crane.webp'
const photo = 'https://lh3.googleusercontent.com/photo?s=96'
const user = { uid: 'saved-user', email: 'local@test.com' } as any

async function legacyProfile(overrides: Partial<PlayerProfile> = {}) {
  const profile = await createDefaultProfile(
    {
      uid: user.uid,
      email: user.email,
      lastUpdated: new Date('2025-01-01'),
      ...overrides,
    },
    avatar,
  )
  // IndexedDB profiles already have the serializer's JSON-safe stats metadata.
  return { ...sanitizeProfile(profile), avatar: oldAvatar }
}

describe('step 3: saved avatars migrate only through existing profile flows', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useState<null | (() => void)>('watcher', () => null).value?.()
    useState('watcher').value = null
    useState('watcher-disabled', () => false).value = false
    useState('sync-status', () => 'idle').value = 'idle'
    useState('sync-adapter', () => null).value = null
    useState('sync-options').value = {
      autoSync: false,
      debounceMs: 1000,
      conflictStrategy: 'last-write-wins',
    }
    useState('profile').value = null
    db.rows.clear()
    db.meta.clear()
    db.writes.mockClear()
  })
  afterEach(() => {
    useState<null | (() => void)>('watcher').value?.()
    useState('watcher').value = null
    vi.useRealTimers()
  })

  it('loads an existing offline guest without writing, changing data, or stamping time', async () => {
    const saved = await legacyProfile({ uid: 'guest_profile', isGuest: true })
    db.rows.set(saved.uid, saved)
    expect(await createLocalGuestProfile()).toEqual({ ...saved, avatar })
    expect(db.rows.get(saved.uid)).toEqual(saved)
    expect(db.writes).not.toHaveBeenCalled()
  })

  it('normalizes local authenticated reads and ordinary saves without a second normalization write', async () => {
    const saved = await legacyProfile()
    db.rows.set(saved.uid, saved)
    const profiles = usePlayerProfile()
    expect(await profiles.getLocalData(saved.uid)).toEqual({ ...saved, avatar })
    expect(db.writes).not.toHaveBeenCalled()
    await profiles.getProfile(user)
    await nextTick()
    await vi.waitFor(() => expect(db.writes).toHaveBeenCalledTimes(1))
    expect(profiles.current.value).toEqual({ ...saved, avatar })
    expect(db.rows.get(saved.uid)).toEqual({ ...saved, avatar })
    await nextTick()
    expect(db.writes).toHaveBeenCalledTimes(1)
  })

  it('keeps an offline/failed push usable and canonical without touching profile data or retrying itself', async () => {
    const saved = await legacyProfile()
    db.rows.set(saved.uid, saved)
    const profiles = usePlayerProfile()
    const push = vi.fn(async () => false)
    const adapter: SyncAdapter = {
      name: 'disposable',
      pull: async () => null,
      push,
      isAvailable: async () => false,
    }
    profiles.setSyncAdapter(adapter, { autoSync: false })
    await profiles.getProfile(user)
    await nextTick()
    await profiles.syncPush()
    expect(push).not.toHaveBeenCalled()
    adapter.isAvailable = async () => true
    await profiles.syncPush()
    expect(push).toHaveBeenCalledExactlyOnceWith(sanitizeProfile({ ...saved, avatar }))
    expect(profiles.current.value).toEqual({ ...saved, avatar })
    await nextTick()
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('does not add auto-sync writes when a saved avatar is normalized during the ordinary load', async () => {
    vi.useFakeTimers()
    const saved = await legacyProfile()
    db.rows.set(saved.uid, saved)
    const profiles = usePlayerProfile()
    const push = vi.fn(async () => true)
    profiles.setSyncAdapter(
      {
        name: 'auto',
        pull: async () => null,
        push,
        isAvailable: async () => true,
      },
      { autoSync: true, debounceMs: 100 },
    )
    await profiles.getProfile(user)
    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)
    expect(push).toHaveBeenCalledExactlyOnceWith(sanitizeProfile({ ...saved, avatar }))
    expect(db.writes).toHaveBeenCalledTimes(1)
    expect(profiles.current.value).toEqual({ ...saved, avatar })
    await profiles.resetLocal()
  })

  it.each(['last-write-wins', 'merge-fields'] as const)(
    'normalizes %s conflict winners without changing precedence or time',
    async (strategy) => {
      const local = await legacyProfile()
      const remote = {
        ...local,
        avatar: photo,
        username: 'Remote',
        lastUpdated: new Date('2024-01-01'),
      }
      const result = await resolveConflict(local, remote, strategy)
      expect(result.resolved.avatar).toBe(avatar)
      expect(result.resolved.username).toBe(local.username)
      expect(result.resolved.lastUpdated).toEqual(local.lastUpdated)
      expect(local.avatar).toBe(oldAvatar)
    },
  )

  it('normalizes Firestore reads and outgoing local/public snapshots, preserving other fields and external photos', async () => {
    const saved = await legacyProfile()
    expect(await sanitizeFirestoreData(saved, saved.uid, '')).toEqual({ ...saved, avatar })
    expect(sanitizeProfile(saved)).toEqual({ ...saved, avatar })
    expect(buildLeaderboardEntry(saved)?.avatar).toBe(avatar)
    expect(readLeaderboardEntry(saved.uid, saved)?.avatar).toBe(avatar)
    expect(sanitizeProfile({ ...saved, avatar: photo })).toEqual({ ...saved, avatar: photo })
  })

  it('adopts a newer remote avatar through the existing pull without an extra push or timestamp', async () => {
    const saved = await legacyProfile()
    db.rows.set(saved.uid, saved)
    const profiles = usePlayerProfile()
    const remote = { ...saved, username: 'Remote', lastUpdated: new Date('2025-01-02') }
    const push = vi.fn(async () => true)
    profiles.setSyncAdapter(
      {
        name: 'remote',
        pull: async () => remote,
        push,
        isAvailable: async () => true,
      },
      { autoSync: true },
    )
    await profiles.getProfile(user)
    await nextTick()
    // Loading already schedules the application's normal auto-sync; disable it
    // before exercising pull so the assertions concern pull's existing guard.
    profiles.configureSyncOptions({ autoSync: false })
    const before = db.writes.mock.calls.length
    const result = await profiles.syncPull()
    expect(result.success).toBe(true)
    expect(profiles.current.value).toEqual({ ...remote, avatar })
    expect(db.rows.get(saved.uid)).toEqual({ ...remote, avatar })
    expect(db.writes.mock.calls.slice(before).filter(([id]) => id === saved.uid)).toHaveLength(1)
    expect(push).not.toHaveBeenCalled()
    await profiles.resetLocal()
  })

  it.each(['new', 'existing', 'local-existing', 'remote-only'] as const)(
    'normalizes %s guest transfer while preserving avatar selection precedence',
    async (mode) => {
      const guest = await legacyProfile({ uid: 'guest_profile', isGuest: true })
      if (mode !== 'remote-only') db.rows.set(guest.uid, guest)
      const remote = mode !== 'new' ? await legacyProfile() : undefined
      if (mode === 'local-existing') db.rows.set(user.uid, remote)
      const profiles = usePlayerProfile()
      const transferred = await profiles.transferGuestProfile(
        user,
        mode === 'local-existing' ? undefined : remote,
      )
      expect(transferred.avatar).toBe(avatar)
      expect(db.rows.get(user.uid).avatar).toBe(avatar)
      expect(transferred.record.coins).toBe(
        mode === 'new'
          ? guest.record.coins + 500
          : mode === 'remote-only'
            ? remote!.record.coins
            : guest.record.coins + remote!.record.coins,
      )
      if (mode === 'remote-only') expect(transferred.lastUpdated).toEqual(remote!.lastUpdated)
    },
  )

  it('keeps the provider photo preferred over the guest avatar on signup', async () => {
    const guest = await legacyProfile({ uid: 'guest_profile', isGuest: true })
    db.rows.set(guest.uid, guest)
    const result = await usePlayerProfile().transferGuestProfile({ ...user, photoURL: photo })
    expect(result.avatar).toBe(photo)
  })
})
