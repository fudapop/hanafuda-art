// @vitest-environment node
import { describe, expect, it } from 'vitest'
import designs from '../../assets/designInfo.json'
import {
  ASSET_ORIGIN,
  CARD_ASSET_REVISION,
  buildAssetUrl,
  buildCardBackUrl,
  buildCardFaceUrl,
  resolveAssetUrl,
} from '../assetUrls'

const legacy = 'https://ymoriyakbittfgocvxbw.supabase.co'
const raw = `${legacy}/storage/v1/object/public/static`
const render = `${legacy}/storage/v1/render/image/public/static`
const publicOrigin = 'https://assets.fudapop.com'

describe('step 1: direct public asset contract', () => {
  it('uses the public origin and revision, with canonical WebP card faces and backs', () => {
    expect(ASSET_ORIGIN).toBe(publicOrigin)
    expect(CARD_ASSET_REVISION).toBe('v1')
    expect(buildCardFaceUrl('cherry-version', 'matsu-ni-tsuru')).toBe(
      `${publicOrigin}/cards/v1/cherry-version/matsu-ni-tsuru.webp`,
    )
    expect(buildCardBackUrl('cherry-version')).toBe(
      `${publicOrigin}/cards/v1/cherry-version/card-back.webp`,
    )
  })

  it('preserves every actual design key, including post-card rather than metadata name postcard', () => {
    expect(designs['post-card'].name).toBe('postcard')
    for (const design of Object.keys(designs)) {
      expect(buildCardFaceUrl(design, 'matsu-ni-tsuru')).toBe(
        `${publicOrigin}/cards/v1/${design}/matsu-ni-tsuru.webp`,
      )
      expect(buildCardBackUrl(design)).toBe(`${publicOrigin}/cards/v1/${design}/card-back.webp`)
    }
  })

  it.each([
    ['avatars', 'flat-crane.webp'],
    ['audio', 'bgm/PerituneMaterial_Awayuki.ogg'],
    ['audio', 'bgm/PerituneMaterial_Awayuki.m4a'],
    ['audio', 'art/gambler-september-logo-512.png'],
    ['assets', 'logo-title.webp'],
  ] as const)('preserves non-card keys: %s/%s', (namespace, key) => {
    expect(buildAssetUrl(namespace, key)).toBe(`${publicOrigin}/${namespace}/${key}`)
  })

  it.each([
    '',
    '.',
    '..',
    '../private',
    '/absolute',
    'a//b',
    'a/../b',
    'a\\b',
    'a%2fb',
    'a?x',
    'a#x',
  ])('refuses unsafe direct keys instead of escaping the namespace: %s', (key) => {
    expect(() => buildAssetUrl('avatars', key)).toThrow(TypeError)
    expect(() => buildCardFaceUrl(key, 'matsu-ni-tsuru')).toThrow(TypeError)
    expect(() => buildCardFaceUrl('post-card', key)).toThrow(TypeError)
    expect(() => buildCardBackUrl(key)).toThrow(TypeError)
  })
})

describe('step 1: recognized legacy mappings', () => {
  it.each([
    ['cards/post-card/matsu-ni-tsuru.webp', 'cards/v1/post-card/matsu-ni-tsuru.webp'],
    ['cards/cherry-version/card-back.png', 'cards/v1/cherry-version/card-back.png'],
    ['cards/otwarte-karty/hagi-ni-inoshishi.jpg', 'cards/v1/otwarte-karty/hagi-ni-inoshishi.jpg'],
    ['avatars/flat-crane.webp', 'avatars/flat-crane.webp'],
    ['audio/bgm/PerituneMaterial_Awayuki.ogg', 'audio/bgm/PerituneMaterial_Awayuki.ogg'],
    ['assets/logo-title.webp', 'assets/logo-title.webp'],
  ])('maps public raw %s without changing its extension', (oldPath, newPath) => {
    expect(resolveAssetUrl(`${raw}/${oldPath}?v=old&t=123`)).toEqual({
      url: `${publicOrigin}/${newPath}`,
      recognized: true,
    })
  })

  it.each(['width=120&resize=contain', 'resize=contain&width=120&t=123&v=old'])(
    'maps only the observed render recipe, dropping its query: %s',
    (query) => {
      expect(resolveAssetUrl(`${render}/cards/post-card/matsu-ni-tsuru.png?${query}`)).toEqual({
        url: `${publicOrigin}/cards/v1/post-card/matsu-ni-tsuru.png`,
        recognized: true,
      })
    },
  )

  it('drops raw legacy query parameters but preserves audio fragments', () => {
    expect(
      resolveAssetUrl(`${raw}/audio/bgm/PerituneMaterial_Awayuki.ogg?download=1#t=12`),
    ).toEqual({
      url: `${publicOrigin}/audio/bgm/PerituneMaterial_Awayuki.ogg#t=12`,
      recognized: true,
    })
  })
})

describe('step 1: strict legacy isolation and safe display passthrough', () => {
  const unchanged = [
    '',
    'not a URL',
    'https://[',
    '/avatars/flat-crane.webp',
    `${publicOrigin}/cards/v1/post-card/card-back.webp?v=keep#fragment`,
    'https://lh3.googleusercontent.com/photo.jpg?sz=120',
    `https://other.supabase.co/storage/v1/object/public/static/avatars/flat-crane.webp`,
    `${legacy}.evil.test/storage/v1/object/public/static/avatars/a.webp`,
    `${legacy}./storage/v1/object/public/static/avatars/a.webp`,
    `https://${legacy.slice(8)}@evil.test/storage/v1/object/public/static/avatars/a.webp`,
    `${legacy.replace('https:', 'http:')}/storage/v1/object/public/static/avatars/a.webp`,
    `${legacy}:444/storage/v1/object/public/static/avatars/a.webp`,
    `https://user:secret@${legacy.slice(8)}/storage/v1/object/public/static/avatars/a.webp`,
    `https://@${legacy.slice(8)}/storage/v1/object/public/static/avatars/a.webp`,
    `https://evil.test@${legacy.slice(8)}/storage/v1/object/public/static/avatars/a.webp`,
    `${legacy}/storage/v1/object/sign/static/avatars/a.webp?token=secret`,
    `${legacy}/storage/v1/object/authenticated/static/avatars/a.webp`,
    `${legacy}/storage/v1/object/public/private/avatars/a.webp`,
    `${legacy}/storage/v1/object/public/static-other/avatars/a.webp`,
    `${legacy}/rest/v1/avatars`,
    `${legacy}/auth/v1/token`,
    `${legacy}/realtime/v1/websocket`,
    `${raw}/unknown/a.webp`,
    `${raw}/avatars/`,
    `${raw}/avatars/a.webp?token=secret`,
    `${raw}/avatars/a.webp?%74oken=secret`,
    `${raw}/avatars/a.webp?X-Amz-Signature=secret`,
    `${legacy}/storage/v1/object/public/static%2favatars/a.webp`,
    `${legacy}/storage/v1/object/public/static/%61vatars/a.webp`,
    `${render}/avatars/flat-crane.webp?width=120&resize=contain`,
    ...[
      '',
      'width=121&resize=contain',
      'width=120',
      'width=120&resize=cover',
      'width=120&resize=contain&height=120',
      'width=120&resize=contain&quality=80',
      'width=120&resize=contain&format=png',
      'width=120&width=240&resize=contain',
      'width=120&resize=contain&token=secret',
    ].map((query) => `${render}/cards/post-card/card-back.webp?${query}`),
    ...[
      '../avatars/a.webp',
      '%2e%2e/avatars/a.webp',
      'x/../../avatars/a.webp',
      'a%2fb.webp',
      'a%2Fb.webp',
      'a%5cb.webp',
      'a%252fb.webp',
      'a\\b.webp',
      '/a.webp',
      './a.webp',
      '%00.webp',
      '%zz.webp',
    ].map((key) => `${raw}/avatars/${key}`),
    `${legacy}/storage/v1/object/private/../public/static/avatars/a.webp`,
    `${legacy}/storage/v1/object/public/static/avatars/a.webp\n`,
  ]

  it.each(unchanged)('leaves unrecognized input unchanged: %s', (url) => {
    expect(resolveAssetUrl(url)).toEqual({ url, recognized: false })
  })

  it('handles absent persisted values without throwing', () => {
    expect(resolveAssetUrl(null)).toEqual({ url: '', recognized: false })
    expect(resolveAssetUrl(undefined)).toEqual({ url: '', recognized: false })
  })

  it('is deterministic and idempotent for mapped, canonical, malformed and hostile inputs', () => {
    for (const input of [...unchanged, `${raw}/avatars/flat-crane.webp?t=123`]) {
      const result = resolveAssetUrl(input)
      expect(resolveAssetUrl(input)).toEqual(result)
      expect(resolveAssetUrl(result.url)).toEqual({ url: result.url, recognized: false })
    }
  })
})
