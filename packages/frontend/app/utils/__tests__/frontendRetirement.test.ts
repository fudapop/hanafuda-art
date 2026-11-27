// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import type { NuxtConfig } from 'nuxt/schema'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('step 5: frontend runtime configuration needs no Supabase environment or credentials', async () => {
  for (const key of Object.keys(process.env).filter((key) => /supabase/i.test(key))) {
    vi.stubEnv(key, undefined)
  }
  vi.stubGlobal('defineNuxtConfig', (config: NuxtConfig) => config)
  const { default: config } = await import('../../../nuxt.config')
  expect(JSON.stringify(config.runtimeConfig)).not.toMatch(/supabase/i)
  // Undefined values must not conceal obsolete runtime config keys.
  expect(Object.keys(config.runtimeConfig!.public!)).not.toEqual(
    expect.arrayContaining([expect.stringMatching(/supabase/i)]),
  )
  expect(Object.keys(config.runtimeConfig!.private ?? {})).not.toEqual(
    expect.arrayContaining([expect.stringMatching(/supabase/i)]),
  )
})

it('step 5: installing the frontend no longer installs a Supabase SDK', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toEqual(
    expect.arrayContaining([expect.stringMatching(/^@supabase\//)]),
  )
})

it('step 5: actual Nuxt generated auto-imports expose no Supabase client initialization', () => {
  for (const path of ['.nuxt/imports.d.ts', '.nuxt/types/imports.d.ts']) {
    expect(readFileSync(path, 'utf8')).not.toMatch(/supabase/i)
  }
})
