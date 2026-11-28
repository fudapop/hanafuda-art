import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PlayerStatusBar from '~/components/PlayerStatusBar.vue'
import OpponentStatusBar from '~/components/OpponentStatusBar.vue'
import PlayerRankingCard from '~/components/cards/PlayerRankingCard.vue'
import ProfilePanel from '~/components/menu/ProfilePanel.vue'
import AvatarSelect from '~/components/menu/AvatarSelect.vue'
import Shout from '~/components/Shout.vue'
import RoundResults from '~/components/modal/RoundResults.vue'
import { useMultiplayerMatch } from '../useMultiplayerMatch'
import { createDefaultProfile } from '~/utils/profile'

const state = vi.hoisted(() => ({
  profile: null as any,
  opponent: null as any,
  photo: null as any,
}))
mockNuxtImport('useI18n', () => () => ({ t: (key: string) => key }))
mockNuxtImport('useProfile', () => () => ({ current: state.profile }))
mockNuxtImport('useCurrentUser', () => () => state.photo)
mockNuxtImport('useStoreManager', () => () => ({}))
mockNuxtImport('usePresence', () => () => ({ opponentPresence: ref(null) }))
mockNuxtImport('useDecisionHandler', () => () => ({
  decisionIsPending: ref(false),
  stopIsCalled: ref(false),
  callKoikoi: vi.fn(),
  callStop: vi.fn(),
}))
mockNuxtImport('useLocalPlayerPerspective', () => () => ({
  selfKey: ref('p1'),
  opponentKey: ref('p2'),
  isMultiplayerGame: ref(true),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: (_db: unknown, collection: string, id: string) => ({ collection, id }),
  getDoc: vi.fn(),
}))

const oldAvatar =
  'https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/avatars/flat-crane.webp?old=1'
const avatar = 'https://assets.fudapop.com/avatars/flat-crane.webp'
const photo = 'https://lh3.googleusercontent.com/photo?s=96'
const slotStub = { template: '<div><slot :close="() => {}" /></div>' }
const options = {
  shallow: true,
  global: { renderStubDefaultSlot: true, stubs: { HeadlessPopoverPanel: slotStub } },
}

describe('step 3: display compatibility never requires a successful profile write', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    state.profile = ref(await createDefaultProfile({ uid: 'inactive' }, avatar))
    state.profile.value.avatar = oldAvatar
    state.photo = ref({ photoURL: photo })
    state.opponent = useState('multiplayer-opponent', () => null)
    state.opponent.value = { uid: 'inactive', username: 'Inactive', avatar: oldAvatar }
    useState('p1Avatar', () => '').value = oldAvatar
    useState('p2Avatar', () => '').value = oldAvatar
  })

  it('renders inactive ranking rows without mutating them and preserves external photos', async () => {
    const player = { ...state.profile.value, totalGames: 0, winRate: 0 }
    const wrapper = await mountSuspended(PlayerRankingCard, {
      ...options,
      props: { player, rank: 1, selectedFilter: 'overall' },
    })
    try {
      expect(wrapper.get('img').attributes('src')).toBe(avatar)
      expect(player.avatar).toBe(oldAvatar)
      await wrapper.setProps({ player: { ...player, avatar: photo } })
      expect(wrapper.get('img').attributes('src')).toBe(photo)
    } finally {
      wrapper.unmount()
    }
  })

  it('renders the profile without rewriting its saved avatar and keeps legacy selection highlighted', async () => {
    const profile = await mountSuspended(ProfilePanel, options)
    try {
      expect(profile.get('img').attributes('src')).toBe(avatar)
      expect(state.profile.value.avatar).toBe(oldAvatar)
    } finally {
      profile.unmount()
    }
    const select = await mountSuspended(AvatarSelect, {
      ...options,
      props: { modelValue: oldAvatar },
    })
    try {
      const selected = select.findAll('img').find((img) => img.attributes('src') === avatar)!
      expect(selected.classes()).toContain('ring-2')
      const external = select.findAll('img').find((img) => img.attributes('src') === photo)!
      await external.trigger('click')
      expect(select.emitted('update:modelValue')).toEqual([[photo]])
    } finally {
      select.unmount()
    }
  })

  it('renders player/opponent status and canonicalizes p1/p2 assignments for shouts', async () => {
    const player = await mountSuspended(PlayerStatusBar, {
      ...options,
      props: { user: state.profile.value },
    })
    const opponent = await mountSuspended(OpponentStatusBar, options)
    try {
      expect(player.get('img').attributes('src')).toBe(avatar)
      expect(opponent.get('img').attributes('src')).toBe(avatar)
      expect(useState('p1Avatar').value).toBe(avatar)
      expect(useState('p2Avatar').value).toBe(avatar)
      state.opponent.value = { ...state.opponent.value, avatar: photo }
      await nextTick()
      expect(opponent.get('img').attributes('src')).toBe(photo)
      expect(useState('p2Avatar').value).toBe(photo)
    } finally {
      player.unmount()
      opponent.unmount()
    }
  })

  it.each(['p1', 'p2'] as const)(
    'renders old %s shout state without mutating session state',
    async (calledBy) => {
      const wrapper = await mountSuspended(Shout, { ...options, props: { calledBy, msg: 'Koi' } })
      try {
        expect(wrapper.get('img[alt="Avatar"]').attributes('src')).toBe(avatar)
        expect(useState(`${calledBy}Avatar`).value).toBe(oldAvatar)
      } finally {
        wrapper.unmount()
      }
    },
  )

  it('renders a saved round-result avatar without rewriting session state', async () => {
    const wrapper = await mountSuspended(RoundResults, options)
    try {
      expect(wrapper.get('img').attributes('src')).toBe(avatar)
      expect(useState('p2Avatar').value).toBe(oldAvatar)
    } finally {
      wrapper.unmount()
    }
  })

  it('resolves opponents fetched directly from old public leaderboard documents', async () => {
    const { getDoc } = await import('firebase/firestore')
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ uid: 'inactive', username: 'Inactive', avatar: oldAvatar }),
    } as any)
    const match = useMultiplayerMatch()
    await match.setOpponentPlayer('inactive')
    expect(getDoc).toHaveBeenCalledWith({ collection: 'leaderboard', id: 'inactive' })
    expect(match.useOpponentPlayer().value).toEqual({
      uid: 'inactive',
      username: 'Inactive',
      avatar,
    })
  })
})
