import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { loadGlossary } from './i18n/glossary.ts'
import { applyJsonEdits, planJsonEdits, type JsonObject } from './i18n/json-locale.ts'
import { parseLocalization, targetLocales } from './i18n/locales.ts'
import { assembleMarkdown, planMarkdownFile, renderFrontMatter, parseFrontSlots } from './i18n/markdown.ts'
import { LOCALIZATION_PATH, assertTranslationTarget } from './i18n/paths.ts'
import { buildPlan, formatPlan, parseNameStatus, type Snapshot } from './i18n/plan.ts'
import { assertPreserved, maskText, unmaskText } from './i18n/protect.ts'
import { runPlan, type ModelClient } from './i18n/run.ts'
import { vertexGenerateContentUrl } from './i18n/vertex.ts'

const repoRoot = join(import.meta.dirname, '..')
const glossary = loadGlossary()
const locales = targetLocales(
  parseLocalization(readFileSync(join(repoRoot, LOCALIZATION_PATH), 'utf8')),
)

const memorySnapshot = (files: Record<string, string>): Snapshot => ({
  read: (path) => files[path] ?? null,
  listMarkdown: () =>
    Object.keys(files)
      .filter((path) => path.startsWith('packages/frontend/content/en/') && path.endsWith('.md'))
      .sort(),
})

const echoClient = (): { client: ModelClient; calls: number } => {
  const state = { calls: 0 }
  const client: ModelClient = async (request) => {
    state.calls += 1
    if (request.echo?.kind === 'prose') return JSON.stringify({ text: request.echo.masked })
    if (request.echo?.kind === 'strings') {
      return JSON.stringify({
        strings: Object.fromEntries(request.echo.entries.map((entry) => [entry.key, entry.masked])),
      })
    }
    throw new Error('missing echo payload')
  }
  return { client, get calls() { return state.calls } }
}

describe('maskText', () => {
  it('restores urls, attribute blocks, placeholders, and card ids', () => {
    const source =
      'See [docs](https://example.com/docs){target="_blank" rel="noopener noreferrer"} and matsu-ni-tsuru for {name}.'
    const masked = maskText(source, glossary.identifiers)
    assert.equal(masked.masked.includes('https://example.com'), false)
    assert.equal(masked.masked.includes('{name}'), false)
    assert.equal(masked.masked.includes('matsu-ni-tsuru'), false)
    assert.equal(masked.masked.includes('target='), false)
    assert.equal(unmaskText(masked.masked, masked.tokens), source)
  })

  it('does not mask Koi-Koi or a version date', () => {
    const source = 'Call Koi-Koi on 2026-04-05.'
    const masked = maskText(source, glossary.identifiers)
    assert.equal(masked.tokens.length, 0)
    assert.match(masked.masked, /Koi-Koi/)
  })

  it('rejects a dropped token', () => {
    const masked = maskText('Hello {name}', glossary.identifiers)
    assert.throws(() => unmaskText('Hello', masked.tokens), /exactly once/)
  })
})

describe('assertPreserved', () => {
  it('rejects a translation that drops an emoji', () => {
    assert.throws(() => assertPreserved('Play 🎮', 'Play'), /emoji/)
  })
})

describe('front matter', () => {
  const inner = [
    'title: "Hello {name}"',
    'date: 2026-04-05',
    'description: "Old"',
    'features:',
    '  - "One"',
  ].join('\n')

  it('keeps the date and substitutes only translatable strings', () => {
    const slots = parseFrontSlots(inner)
    const rendered = renderFrontMatter(inner, slots, {
      title: 'Bonjour {name}',
      description: 'Ancien',
      'features.0': 'Un',
    })
    assert.match(rendered, /date: 2026-04-05/)
    assert.match(rendered, /title: "Bonjour \{name\}"/)
    assert.doesNotMatch(rendered, /Hello/)
  })
})

describe('changelog sections', () => {
  const before = '# Changelog\n\n## [2026.4.0] - 2026-04-05\n\n### Features\n- Old\n'
  const after =
    '# Changelog\n\n## Unreleased\n\n### Bug Fixes\n- New [docs](https://example.com/a)\n\n## [2026.4.0] - 2026-04-05\n\n### Features\n- Old\n'
  const existing = '# 更新履歴\n\n## [2026.4.0] - 2026-04-05\n\n### 新機能\n- 古い\n'
  const sourcePath = 'packages/frontend/content/en/misc/changelog.md'

  it('leaves an unchanged changelog alone', () => {
    const plan = planMarkdownFile({
      mode: 'changed',
      locale: 'ja',
      sourcePath,
      targetPath: 'packages/frontend/content/ja/misc/changelog.md',
      before,
      after: before,
      existing,
      glossary,
    })
    assert.equal(plan, null)
  })

  it('translates only the new section and keeps the reviewed section', async () => {
    const planned = planMarkdownFile({
      mode: 'changed',
      locale: 'ja',
      sourcePath,
      targetPath: 'packages/frontend/content/ja/misc/changelog.md',
      before,
      after,
      existing,
      glossary,
    })
    assert.ok(planned && planned.kind === 'markdown')
    assert.deepEqual(planned.prose.map((part) => part.id), ['unreleased'])
    const echo = echoClient()
    const files = new Map<string, string>([[planned.targetPath, existing]])
    const result = await runPlan({
      plan: { mode: 'changed', locales: ['ja'], files: [planned] },
      client: echo.client,
      glossary,
      locales,
      delayMs: 0,
      workspace: {
        read: (path) => files.get(path) ?? null,
        write: (path, contents) => files.set(path, contents),
        remove: (path) => files.delete(path),
      },
    })
    const written = files.get(planned.targetPath) ?? ''
    assert.deepEqual(result.written, [planned.targetPath])
    assert.equal(echo.calls, 1)
    assert.match(written, /# 更新履歴/)
    assert.match(written, /## Unreleased/)
    assert.match(written, /https:\/\/example.com\/a/)
    assert.match(written, /### 新機能/)
    assert.match(written, /- 古い/)
    assert.doesNotMatch(written, /- Old/)
    assert.doesNotMatch(written, /packages\/frontend\/content\/en\//)
  })
})

describe('json edits', () => {
  it('updates changed and missing strings, copies glossary terms, and deletes removed keys', () => {
    const before: JsonObject = {
      common: { a: 'Keep', b: 'Old', d: 'Same', e: 'Gone' },
    }
    const after: JsonObject = {
      common: { a: 'Keep', b: 'New', c: 'Five Brights', d: 'Same' },
    }
    const existing: JsonObject = {
      common: { a: '残す', b: '古い', e: '消す' },
    }
    const edits = planJsonEdits({
      before,
      after,
      existing,
      mode: 'changed',
      glossary,
      locale: 'ja',
    })
    const paths = edits.map((edit) => `${edit.op}:${edit.path.join('.')}`)
    assert.equal(paths.includes('set:common.a'), false)
    assert.ok(paths.includes('set:common.b'))
    assert.ok(paths.includes('set:common.c'))
    assert.ok(paths.includes('set:common.d'))
    assert.ok(paths.includes('remove:common.e'))
    const fiveBrights = edits.find((edit) => edit.op === 'set' && edit.path.join('.') === 'common.c')
    assert.ok(fiveBrights && fiveBrights.op === 'set')
    assert.equal(fiveBrights.keep, '五光')

    const existingRaw = JSON.stringify(existing, null, 2) + '\n'
    const next = applyJsonEdits(existingRaw, edits, {
      'common.b': '新しい',
      'common.d': '同じ',
    })
    const parsed = JSON.parse(next) as { common: Record<string, string> }
    assert.deepEqual(Object.keys(parsed.common), ['a', 'b', 'c', 'd'])
    assert.equal(parsed.common.a, '残す')
    assert.equal(parsed.common.b, '新しい')
    assert.equal(parsed.common.c, '五光')
    assert.equal(parsed.common.e, undefined)
  })
})

describe('buildPlan', () => {
  const localization = JSON.stringify({
    defaultLocale: 'en',
    locales: [
      { name: 'English', code: 'en', language: 'en-US', file: 'en-us.json', dir: 'ltr' },
      { name: '日本語', code: 'ja', language: 'ja-JP', file: 'ja-jp.json', dir: 'ltr' },
    ],
  })
  const englishJson = JSON.stringify({ game: { title: 'Play {name}' } }, null, 2) + '\n'
  const page = '---\ntitle: Hello\ndate: 2026-04-05\n---\n\nHello\n'

  it('plans changed files for target locales and refuses English paths', () => {
    const beforeFiles = {
      'packages/frontend/localization.json': localization,
      'packages/frontend/i18n/locales/en-us.json': englishJson,
      'packages/frontend/i18n/locales/ja-jp.json': JSON.stringify({ game: { title: 'あそぶ {name}' } }) + '\n',
      'packages/frontend/content/en/misc/changelog.md': '# Changelog\n\n## [2026.4.0] - 2026-04-05\n\n- Old\n',
      'packages/frontend/content/ja/misc/changelog.md': '# 更新履歴\n\n## [2026.4.0] - 2026-04-05\n\n- 古い\n',
      'packages/frontend/content/en/announcements/1.md': page,
      'packages/frontend/content/ja/announcements/1.md': page,
    }
    const afterFiles = {
      ...beforeFiles,
      'packages/frontend/content/en/misc/changelog.md':
        '# Changelog\n\n## Unreleased\n\n- New\n\n## [2026.4.0] - 2026-04-05\n\n- Old\n',
    }
    const plan = buildPlan({
      mode: 'changed',
      changes: parseNameStatus('M\tpackages/frontend/content/en/misc/changelog.md\n'),
      before: memorySnapshot(beforeFiles),
      after: memorySnapshot(afterFiles),
      glossary,
    })
    assert.deepEqual(plan.locales, ['ja'])
    assert.equal(plan.files.length, 1)
    assert.equal(plan.files[0].kind, 'markdown')
    for (const file of plan.files) {
      assert.doesNotThrow(() => assertTranslationTarget(file.targetPath))
      assert.equal(file.targetPath.includes('/en/'), false)
    }
  })

  it('deletes the locale file when the English page is removed', () => {
    const files = {
      'packages/frontend/localization.json': localization,
      'packages/frontend/i18n/locales/en-us.json': englishJson,
      'packages/frontend/content/en/announcements/1.md': page,
      'packages/frontend/content/ja/announcements/1.md': page,
    }
    const after = { ...files }
    delete after['packages/frontend/content/en/announcements/1.md']
    const plan = buildPlan({
      mode: 'changed',
      changes: parseNameStatus('D\tpackages/frontend/content/en/announcements/1.md\n'),
      before: memorySnapshot(files),
      after: memorySnapshot(after),
      glossary,
    })
    assert.deepEqual(plan.files, [
      { kind: 'delete', targetPath: 'packages/frontend/content/ja/announcements/1.md' },
    ])
  })

  it('parses renames', () => {
    const changes = parseNameStatus('R100\tpackages/frontend/content/en/a.md\tpackages/frontend/content/en/b.md\n')
    assert.deepEqual(changes, [
      {
        status: 'R',
        from: 'packages/frontend/content/en/a.md',
        to: 'packages/frontend/content/en/b.md',
      },
    ])
  })
})

describe('vertexGenerateContentUrl', () => {
  it('builds regional and global endpoints', () => {
    assert.equal(
      vertexGenerateContentUrl('hanafuda-art', 'us-central1', 'gemini-2.5-flash'),
      'https://us-central1-aiplatform.googleapis.com/v1/projects/hanafuda-art/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent',
    )
    assert.match(vertexGenerateContentUrl('hanafuda-art', 'global', 'gemini-2.5-flash'), /^https:\/\/aiplatform\.googleapis\.com\//)
  })

  it('rejects a project id that would change the URL', () => {
    assert.throws(() => vertexGenerateContentUrl('bad/id', 'us-central1', 'gemini-2.5-flash'), /project id/)
  })
})

describe('formatPlan', () => {
  it('names the locales configured in the repository', () => {
    const output = execFileSync(
      process.execPath,
      ['--experimental-strip-types', 'scripts/i18n-translate.ts', '--mode', 'full', '--plan'],
      { cwd: repoRoot, encoding: 'utf8' },
    )
    assert.match(output, /Locales: ja, pl, ru, fr/)
    assert.match(output, /Files: \d+/)
    assert.doesNotMatch(output, /content\/en\//)
    assert.match(formatPlan({ mode: 'changed', locales: ['ja'], files: [] }), /No files need translation/)
  })
})

describe('runPlan guards', () => {
  it('does not write when the model drops a placeholder', async () => {
    const planned = planMarkdownFile({
      mode: 'full',
      locale: 'ja',
      sourcePath: 'packages/frontend/content/en/misc/note.md',
      targetPath: 'packages/frontend/content/ja/misc/note.md',
      before: null,
      after: 'Hello {name} 🎮\n',
      existing: null,
      glossary,
    })
    assert.ok(planned && planned.kind === 'markdown')
    const writes: string[] = []
    const client: ModelClient = async () => JSON.stringify({ text: 'こんにちは' })
    await assert.rejects(
      () =>
        runPlan({
          plan: { mode: 'full', locales: ['ja'], files: [planned] },
          client,
          glossary,
          locales,
          delayMs: 0,
          workspace: {
            read: () => null,
            write: (path) => writes.push(path),
            remove: () => undefined,
          },
        }),
      /exactly once|brace group|emoji/,
    )
    assert.deepEqual(writes, [])
  })
})
