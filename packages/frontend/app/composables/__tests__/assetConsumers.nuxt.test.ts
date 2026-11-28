import { readFileSync } from 'node:fs'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { effectScope, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCardDesign } from '../useCardDesign'
import { useAvatar } from '../useAvatar'
import { useAudio } from '../useAudio'
import { DECK } from '~/utils/cards'
import { ASSET_ORIGIN, buildAssetUrl, buildCardBackUrl, buildCardFaceUrl } from '~/utils/assetUrls'
import SignIn from '~/pages/sign-in.vue'

mockNuxtImport('useI18n', () => () => ({ locale: ref('en'), t: (key: string) => key }))
mockNuxtImport('useState', () => (_key: string, init: () => unknown) => ref(init()))
mockNuxtImport('useProfile', () => () => ({ current: ref(null) }))
vi.mock('@vueuse/core', () => ({
  useStorage: (_key: string, defaults: unknown) => ref(defaults),
}))

const legacy = (url: string) =>
  url.replace(
    ASSET_ORIGIN,
    'https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static',
  )

class StubAudio extends EventTarget {
  static instances: StubAudio[] = []
  src: string
  loop = false
  preload = ''
  volume = 1
  paused = true
  play = vi.fn(async () => {
    this.paused = false
  })
  pause = vi.fn(() => {
    this.paused = true
  })
  setAttribute = vi.fn()

  constructor(src = '') {
    super()
    this.src = src
    StubAudio.instances.push(this)
  }
}

describe('step 2: current consumers request canonical public assets', () => {
  let scope: ReturnType<typeof effectScope>
  let mediaSessionDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    scope = effectScope()
    StubAudio.instances = []
    vi.stubGlobal('Audio', StubAudio)
    vi.stubGlobal(
      'MediaMetadata',
      vi.fn().mockImplementation((data: object) => data),
    )
    mediaSessionDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaSession')
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: { metadata: null, setActionHandler: vi.fn(), playbackState: 'none' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    if (mediaSessionDescriptor) {
      Object.defineProperty(navigator, 'mediaSession', mediaSessionDescriptor)
    } else {
      Reflect.deleteProperty(navigator, 'mediaSession')
    }
  })

  it('renders the sign-in artwork from the shared public asset namespace', async () => {
    const wrapper = await mountSuspended(SignIn, {
      route: '/sign-in?exit=1',
      shallow: true,
      global: { renderStubDefaultSlot: true },
    })
    try {
      expect(wrapper.get('[data-sign-in-logo] img').attributes('src')).toBe(
        buildAssetUrl('assets', 'logo-title.webp'),
      )
    } finally {
      wrapper.unmount()
    }
  })

  it('derives every enabled face from DECK, preserves selection/metadata, and preloads the same URLs', async () => {
    const cards = scope.run(() => useCardDesign())!
    await nextTick()
    expect(cards.DESIGNS).not.toContain('ramen-red')
    for (const design of cards.DESIGNS) {
      const urls = cards.getCardUrlMap(design)
      expect([...urls.keys()]).toEqual([...DECK])
      expect([...urls.values()]).toEqual(DECK.map((face) => buildCardFaceUrl(design, face)))
    }
    cards.currentDesign.value = 'post-card'
    expect(cards.getDesignInfo().name).toBe('postcard')
    expect(cards.getCardUrl(DECK[0]!)).toBe(buildCardFaceUrl('post-card', DECK[0]!))
    expect(cards.getDesignInfo('otwarte-karty').arrangement?.orderByName).toHaveLength(DECK.length)
    await cards.preloadCardImageCache('post-card')
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(
      DECK.map((face) => buildCardFaceUrl('post-card', face)),
    )
  })

  it('extracts all eleven image backs from actual CSS with canonical design folders', () => {
    const css = readFileSync('app/assets/css/card-styles.css', 'utf8')
    const urls = [...css.matchAll(/url\(['"]([^'"]+\/([^/]+)\/card-back\.webp)['"]\)/g)]
    expect(urls).toHaveLength(11)
    for (const [, url, design] of urls) expect(url).toBe(buildCardBackUrl(design!))
  })

  it('generates avatar selections and both default players from the shared public namespace', () => {
    const avatars = scope.run(() => useAvatar())!
    for (const avatar of avatars.listAvatars()) {
      expect(avatar.url).toBe(buildAssetUrl('avatars', `${avatar.name}.webp`))
      expect(avatars.getAvatarUrl(avatar.name)).toBe(avatar.url)
    }
    expect(avatars.listAvatarUrls()).toContain(avatars.p1Avatar.value)
    expect(avatars.listAvatarUrls()).toContain(avatars.p2Avatar.value)
    expect(avatars.p1Avatar.value).not.toContain('gamblers')
    expect(avatars.p2Avatar.value).toContain('gamblers')
  })

  it('uses direct BGM/SFX/art preloads and retains ordered ogg/m4a/mp3 fallback and looping', async () => {
    const audio = scope.run(() => useAudio())!
    for (const track of Object.values(audio.BGM_TRACKS)) {
      expect(track.sources.map((src) => new URL(src).origin)).toEqual([
        ASSET_ORIGIN,
        ASSET_ORIGIN,
        ASSET_ORIGIN,
      ])
      expect(track.sources.map((src) => src.split('.').pop())).toEqual(['ogg', 'm4a', 'mp3'])
      expect(track.artwork).toMatch(`${ASSET_ORIGIN}/audio/art/`)
    }
    audio.initAudio('main')
    const element = StubAudio.instances[0]!
    expect(element.src).toBe(audio.BGM.main)
    expect(element.loop).toBe(true)
    expect(element.preload).toBe('none')
    expect(element.volume).toBe(audio.bgmVolume.value)
    element.dispatchEvent(new Event('error'))
    expect(element.src).toBe(audio.BGM.mainM4a)
    element.dispatchEvent(new Event('error'))
    expect(element.src).toBe(audio.BGM.mainMp3)
    element.dispatchEvent(new Event('error'))
    expect(element.src).toBe(audio.BGM.mainMp3)
    await audio.preloadAudioCache()
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      ...Object.values(audio.BGM_TRACKS).map((track) => track.sources[0]),
      ...Object.values(audio.SFX),
      ...Object.values(audio.BGM_TRACKS).map((track) => track.artwork),
    ])
    for (const src of Object.values(audio.SFX)) expect(src).toMatch(`${ASSET_ORIGIN}/audio/sfx/`)
    expect(navigator.mediaSession.metadata?.artwork.map((art) => art.src)).toEqual([
      audio.BGM_TRACKS.main.artwork,
      buildAssetUrl('assets', 'logo-title.webp'),
    ])
  })

  it('normalizes legacy init URLs before assignment, metadata matching, and same-track crossfade checks', async () => {
    const audio = scope.run(() => useAudio())!
    audio.initAudio(`${legacy(buildAssetUrl('audio', 'bgm/PerituneMaterial_Awayuki.m4a'))}?v=old`)
    expect(StubAudio.instances[0]!.src).toBe(audio.BGM.mainM4a)
    expect(audio.currentTrack.value).toBe(audio.BGM.mainM4a)
    expect(audio.currentTrackName.value).toBe('Awayuki')
    expect(navigator.mediaSession.metadata?.title).toBe('Awayuki')
    await audio.crossfadeTo(audio.BGM.mainMp3)
    expect(StubAudio.instances.every((element) => element.play.mock.calls.length === 0)).toBe(true)
  })

  it('normalizes legacy crossfade URLs before assignment and matches direct tracks across formats', async () => {
    vi.useFakeTimers()
    const audio = scope.run(() => useAudio())!
    audio.initAudio(buildAssetUrl('audio', 'bgm/PerituneMaterial_Awayuki.ogg'))
    await audio.crossfadeTo(
      `${legacy(buildAssetUrl('audio', 'bgm/PerituneMaterial_EpicBattle_J_loop.mp3'))}?t=old`,
      0.1,
    )
    const target = StubAudio.instances[1]!
    expect(target.src).toBe(audio.BGM.koikoi1Mp3)
    expect(target.loop).toBe(true)
    expect(target.play).toHaveBeenCalledOnce()
    expect(audio.currentTrackName.value).toBe('Epic Battle J')
    expect(navigator.mediaSession.metadata?.title).toBe('Epic Battle J')
    await vi.advanceTimersByTimeAsync(150)
    expect(StubAudio.instances[0]!.paused).toBe(true)
    expect(target.volume).toBe(audio.bgmVolume.value)
    await audio.crossfadeTo(legacy(audio.BGM.koikoi1M4a))
    expect(StubAudio.instances[2]!.play).not.toHaveBeenCalled()
  })

  it('leaves unrecognized external audio URLs unchanged', async () => {
    const audio = scope.run(() => useAudio())!
    const external = 'https://example.com/music.mp3?version=2'
    audio.initAudio(external)
    expect(StubAudio.instances[0]!.src).toBe(external)
    expect(audio.currentTrackName.value).toBeNull()
    audio.toggleBgmDisabled()
    await audio.crossfadeTo(external)
    expect(audio.currentTrack.value).toBe(external)
    expect(StubAudio.instances[1]!.play).not.toHaveBeenCalled()
  })
})
