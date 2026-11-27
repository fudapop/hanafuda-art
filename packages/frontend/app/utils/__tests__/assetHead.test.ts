// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import type { NuxtConfig } from 'nuxt/schema'
import { ASSET_ORIGIN, buildAssetUrl } from '../assetUrls'

afterEach(() => vi.unstubAllGlobals())

it('step 2: builds both SEO images and connection hints from the fixed public asset origin', async () => {
  vi.stubGlobal('defineNuxtConfig', (config: NuxtConfig) => config)
  const { default: config } = await import('../../../nuxt.config')
  const head = config.app!.head!
  const images = head.meta!.filter(
    (entry) => entry?.property === 'og:image' || entry?.name === 'twitter:image',
  )
  expect(images).toHaveLength(2)
  expect(images.map((entry) => entry?.content)).toEqual([
    buildAssetUrl('assets', 'og-image-large.png'),
    buildAssetUrl('assets', 'og-image-large.png'),
  ])
  for (const rel of ['preconnect', 'dns-prefetch']) {
    expect(head.link).toContainEqual({ rel, href: ASSET_ORIGIN })
  }
  expect(head.link!.some((entry) => String(entry?.href).includes('supabase'))).toBe(false)
})
