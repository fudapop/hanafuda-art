import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayerProfile, SyncAdapter } from '~~/types/profile'

vi.mock('dexbee-js', () => {
  throw new Error('dexbee-js disabled in profile sync tests')
})

describe('usePlayerProfile sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const watcher = useState<null | (() => void)>('watcher', () => null)
    watcher.value?.()
    watcher.value = null
    useState('watcher-disabled', () => false).value = false
    useState('sync-status', () => 'idle').value = 'idle'
    useState('sync-adapter', () => null).value = null
    useState<PlayerProfile | null>('profile', () => null).value = null
  })

  it('keeps the local email when the adapter returns a newer email-free profile', async () => {
    const { createDefaultProfile } = await import('../../app/utils/profile')
    const { usePlayerProfile } = await import('../../app/composables/usePlayerProfile')
    const playerProfile = usePlayerProfile()

    const local = await createDefaultProfile(
      {
        uid: 'user-1',
        email: 'local@test.com',
        username: 'LocalUser',
        lastUpdated: new Date('2025-01-01T00:00:00Z'),
      },
      '/avatars/flat-crane.webp',
    )
    const remote: PlayerProfile = {
      ...local,
      email: '',
      username: 'RemoteUser',
      lastUpdated: new Date('2025-01-02T00:00:00Z'),
    }

    playerProfile.setSyncAdapter(adapterReturning(remote), { autoSync: false })
    useState<PlayerProfile | null>('profile').value = local
    await nextTick()
    await vi.waitFor(async () => {
      expect((await playerProfile.getLocalData('user-1'))?.email).toBe('local@test.com')
    })

    const result = await playerProfile.syncPull()

    expect(result.success).toBe(true)
    expect(result.merged?.email).toBe('local@test.com')
    expect(result.merged?.username).toBe('RemoteUser')
    expect(useState<PlayerProfile | null>('profile').value?.email).toBe('local@test.com')
    expect((await playerProfile.getLocalData('user-1'))?.email).toBe('local@test.com')
  })

  it('leaves sync idle after a failed push so a later change can retry', async () => {
    const { createDefaultProfile } = await import('../../app/utils/profile')
    const { usePlayerProfile } = await import('../../app/composables/usePlayerProfile')
    const playerProfile = usePlayerProfile()
    let pushes = 0

    const local = await createDefaultProfile(
      {
        uid: 'user-2',
        email: 'player@test.com',
        username: 'RetryUser',
        lastUpdated: new Date('2025-01-01T00:00:00Z'),
      },
      '/avatars/flat-crane.webp',
    )

    const failing: SyncAdapter = {
      name: 'failing',
      async pull() {
        return null
      },
      async push() {
        pushes += 1
        return false
      },
      async isAvailable() {
        return true
      },
    }

    playerProfile.setSyncAdapter(failing, { autoSync: false })
    useState<PlayerProfile | null>('profile').value = local

    const first = await playerProfile.syncPush()
    expect(first.success).toBe(false)
    expect(playerProfile.syncStatus.value).toBe('idle')
    expect((await playerProfile.getSyncMetadata())?.pendingChanges).toBe(true)

    const second = await playerProfile.syncPush()
    expect(second.success).toBe(false)
    expect(pushes).toBe(2)
    expect(playerProfile.syncStatus.value).toBe('idle')
  })
})

function adapterReturning(remote: PlayerProfile): SyncAdapter {
  return {
    name: 'remote-wins',
    async pull() {
      return remote
    },
    async push() {
      return true
    },
    async isAvailable() {
      return true
    },
    async resolve() {
      return remote
    },
  }
}
