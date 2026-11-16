import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { pathToFileURL } from 'node:url'
import { loadGlossary } from './i18n/glossary.ts'
import { applyJsonEdits, planJsonEdits, type JsonObject } from './i18n/json-locale.ts'
import { parseLocalization, targetLocales } from './i18n/locales.ts'
import { assembleMarkdown, planMarkdownFile, renderFrontMatter, parseFrontSlots } from './i18n/markdown.ts'
import {
  loadPendingTranslations,
  materializePendingTranslations,
  mergeLocaleContents,
  selectPendingFiles,
} from './i18n/pending.ts'
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
    if (request.echo?.kind === 'prose-batch') {
      return JSON.stringify({
        parts: Object.fromEntries(request.echo.parts.map((part) => [part.id, part.masked])),
      })
    }
    if (request.echo?.kind === 'strings') {
      return JSON.stringify({
        strings: Object.fromEntries(request.echo.entries.map((entry) => [entry.key, entry.masked])),
      })
    }
    throw new Error('missing echo payload')
  }
  return { client, get calls() { return state.calls } }
}

describe('translation workflow range', () => {
  const workflow = readFileSync(join(repoRoot, '.github/workflows/translate-content.yml'), 'utf8')

  const resolveRange = (overrides: Record<string, string> = {}) => {
    const block = workflow.match(/      - name: Resolve translation range\n[\s\S]*?        run: \|\n((?:          .*\n|\n)+)/)
    assert.ok(block, 'workflow must resolve one shared range before planning and translating')
    const script = block[1].replace(/^          /gm, '')
    const dir = mkdtempSync(join(tmpdir(), 'i18n-range-'))
    const git = (args: string[]) =>
      execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
    try {
      git(['init', '-b', 'main'])
      git(['config', 'user.email', 'test@example.com'])
      git(['config', 'user.name', 'Test'])
      git(['commit', '--allow-empty', '-m', 'base'])
      const base = git(['rev-parse', 'HEAD'])
      git(['tag', 'translated-base'])
      git(['checkout', '-b', 'other'])
      git(['commit', '--allow-empty', '-m', 'other'])
      git(['checkout', 'main'])
      git(['commit', '--allow-empty', '-m', 'head'])
      const head = git(['rev-parse', 'HEAD'])
      const output = join(dir, 'output')
      writeFileSync(output, '')
      const result = spawnSync('bash', ['-c', script], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          EVENT_NAME: 'workflow_dispatch',
          REQUESTED_MODE: 'changed',
          BASE_REF: 'translated-base',
          PUSH_BASE_SHA: base,
          HEAD_SHA: head,
          ...overrides,
          GITHUB_OUTPUT: output,
        },
      })
      return { ...result, output: readFileSync(output, 'utf8'), base, head }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it('defaults manual runs to incremental and shares the resolved range', () => {
    assert.match(workflow, /mode:\n[\s\S]*?type: choice\n[\s\S]*?default: changed/)
    for (const name of ['Plan translations', 'Translate']) {
      const step = workflow.slice(workflow.indexOf(`      - name: ${name}\n`)).split('\n      - name: ')[0]
      assert.match(step, /MODE: \$\{\{ steps\.range\.outputs\.mode \}\}/)
      assert.match(step, /BASE_SHA: \$\{\{ steps\.range\.outputs\.base \}\}/)
      assert.match(step, /HEAD_SHA: \$\{\{ steps\.range\.outputs\.head \}\}/)
      assert.match(step, /--pending-ref origin\/i18n\/update-translations/)
      assert.doesNotMatch(step, /MODE=full/)
    }
  })

  it('resolves a manual base tag to a full SHA', () => {
    const result = resolveRange()
    assert.equal(result.status, 0, result.stdout + result.stderr)
    assert.equal(result.output, `mode=changed\nbase=${result.base}\nhead=${result.head}\n`)
  })

  it('requires a base for a manual incremental run', () => {
    const result = resolveRange({ BASE_REF: '' })
    assert.notEqual(result.status, 0)
    assert.match(result.stdout + result.stderr, /base_ref is required/)
    assert.equal(result.output, '')
  })

  it('rejects unknown or non-ancestor bases instead of falling back to full', () => {
    for (const base of ['missing-ref', 'other', '--help']) {
      const result = resolveRange({ BASE_REF: base })
      assert.notEqual(result.status, 0, base)
      assert.equal(result.output, '', base)
    }
  })

  it('allows explicit full mode without a base', () => {
    const result = resolveRange({ REQUESTED_MODE: 'full', BASE_REF: '' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
    assert.equal(result.output, `mode=full\nbase=\nhead=${result.head}\n`)
  })

  it('keeps push events incremental and uses the push base', () => {
    const result = resolveRange({ EVENT_NAME: 'push', REQUESTED_MODE: 'full', BASE_REF: 'missing-ref' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
    assert.equal(result.output, `mode=changed\nbase=${result.base}\nhead=${result.head}\n`)
  })

  it('rejects an unsupported manual mode', () => {
    const result = resolveRange({ REQUESTED_MODE: 'typo' })
    assert.notEqual(result.status, 0)
    assert.equal(result.output, '')
  })
})

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

  it('restores an image url without protecting it twice', () => {
    const source = '![card](https://example.com/card.png)'
    const masked = maskText(source, glossary.identifiers)
    assert.equal(masked.tokens.length, 1)
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

describe('removed front matter', () => {
  it('drops locale front matter when English removes the block and the body is unchanged', () => {
    const before = '---\ntitle: Hello\ndate: 2026-04-05\n---\n\nBody\n'
    const after = 'Body\n'
    const existing = '---\ntitle: こんにちは\ndate: 2026-04-05\n---\n\n本文\n'
    const planned = planMarkdownFile({
      mode: 'changed',
      locale: 'ja',
      sourcePath: 'packages/frontend/content/en/misc/note.md',
      targetPath: 'packages/frontend/content/ja/misc/note.md',
      before,
      after,
      existing,
      glossary,
    })
    assert.ok(planned && planned.kind === 'markdown')
    assert.equal(planned.front.type, 'none')
    assert.equal(planned.prose.length, 0)
    const assembled = assembleMarkdown(planned, { strings: {}, prose: {} })
    assert.equal(assembled.includes('---'), false)
    assert.match(assembled, /本文/)
  })
})

describe('prose batches', () => {
  it('translates two changed sections in one reply and keeps protected tokens', async () => {
    const before = '# Changelog\n\n## [2026.4.0] - 2026-04-05\n\n### Features\n- Old\n'
    const after = [
      '# Changelog',
      '',
      '## [2026.11.0] - 2026-11-14',
      '',
      '- New [a](https://example.com/a) {name}',
      '',
      '## [2026.5.0] - 2026-05-01',
      '',
      '- Also [b](https://example.com/b)',
      '',
      '## [2026.4.0] - 2026-04-05',
      '',
      '### Features',
      '- Old',
      '',
    ].join('\n')
    const existing = '# 更新履歴\n\n## [2026.4.0] - 2026-04-05\n\n### 新機能\n- 古い\n'
    const planned = planMarkdownFile({
      mode: 'changed',
      locale: 'ja',
      sourcePath: 'packages/frontend/content/en/misc/changelog.md',
      targetPath: 'packages/frontend/content/ja/misc/changelog.md',
      before,
      after,
      existing,
      glossary,
    })
    assert.ok(planned && planned.kind === 'markdown')
    assert.deepEqual(planned.prose.map((part) => part.id), ['2026.11.0', '2026.5.0'])
    const echo = echoClient()
    const files = new Map<string, string>()
    await runPlan({
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
    assert.equal(echo.calls, 1)
    assert.match(written, /https:\/\/example.com\/a/)
    assert.match(written, /https:\/\/example.com\/b/)
    assert.match(written, /\{name\}/)
    assert.match(written, /- 古い/)
    assert.doesNotMatch(written, /- Old/)
  })
})

describe('pending translations', () => {
  for (const olderRequest of [true, false]) {
    it(olderRequest
      ? 'preserves an older manual catch-up range and pending locale edits through the CLI'
      : 'extends a newer requested range to include the older pending baseline', () => {
      const dir = mkdtempSync(join(tmpdir(), 'i18n-catch-up-'))
      const git = (args: string[]) =>
        execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
      const write = (path: string, contents: string) => {
        mkdirSync(join(dir, path, '..'), { recursive: true })
        writeFileSync(join(dir, path), contents)
      }
      const commit = (message: string) => {
        git(['add', '.'])
        git(['commit', '-m', message])
        return git(['rev-parse', 'HEAD'])
      }
      const sourcePage = 'packages/frontend/content/en/misc/note.md'
      const targetPage = 'packages/frontend/content/ja/misc/note.md'
      const sourceJson = 'packages/frontend/i18n/locales/en-us.json'
      const targetJson = 'packages/frontend/i18n/locales/ja-jp.json'
      const english = { common: { missed: 'Old UI', later: 'Old later UI', keep: 'Unchanged' } }
      const localized = { common: { missed: 'Old localized UI', later: 'Old localized later', keep: 'Old reviewed UI' } }
      try {
        git(['init', '-b', 'main'])
        git(['config', 'user.email', 'test@example.com'])
        git(['config', 'user.name', 'Test'])
        write(LOCALIZATION_PATH, JSON.stringify({
          defaultLocale: 'en',
          locales: [
            { name: 'English', code: 'en', language: 'en-US', file: 'en-us.json', dir: 'ltr' },
            { name: '日本語', code: 'ja', language: 'ja-JP', file: 'ja-jp.json', dir: 'ltr' },
          ],
        }))
        write(sourcePage, 'Old English page\n')
        write(targetPage, 'Old localized page\n')
        write(sourceJson, JSON.stringify(english))
        write(targetJson, JSON.stringify(localized))
        const requestedBase = commit('last complete translation')

        write(sourcePage, 'Missed English page\n')
        english.common.missed = 'Missed English UI'
        write(sourceJson, JSON.stringify(english))
        commit('English changes whose translation was skipped')
        english.common.later = 'Later English UI'
        write(sourceJson, JSON.stringify(english))
        commit('later English push that opens a translation PR')

        git(['checkout', '-b', 'i18n/update-translations'])
        write(targetJson, JSON.stringify({ common: {
          ...localized.common,
          later: 'Pending later UI',
          keep: 'Reviewed pending UI',
        } }))
        commit('pending translations and reviewed wording')
        git(['checkout', 'main'])
        if (!olderRequest) {
          write(sourcePage, 'Newest English page\n')
          commit('newer English push')
        }
        const head = git(['rev-parse', 'HEAD'])
        const args = [
          '--experimental-strip-types', join(repoRoot, 'scripts/i18n-translate.ts'),
          '--mode', 'changed', '--base', olderRequest ? requestedBase : head, '--head', head,
        ]
        const cli = (extra: string[]) => execFileSync(process.execPath, [...args, ...extra], {
          cwd: dir,
          encoding: 'utf8',
          env: { ...process.env, GCP_ACCESS_TOKEN: 'test-token', GCP_PROJECT_ID: 'test-project' },
        })
        const noPending = cli(['--plan'])
        if (olderRequest) assert.match(noPending, /Files: 2/)
        else assert.match(noPending, /No files need translation/)

        const pendingArgs = ['--pending-ref', 'i18n/update-translations']
        const preview = cli([...pendingArgs, '--plan'])
        assert.match(preview, new RegExp(`Files: ${olderRequest ? 2 : 1}`))
        assert.ok(preview.includes(targetPage), preview)
        if (olderRequest) assert.ok(preview.includes(targetJson), preview)
        assert.equal(git(['status', '--porcelain']), '', 'preview must not materialize pending edits')

        const mockVertex = join(dir, 'mock-vertex.mjs')
        writeFileSync(mockVertex, `globalThis.fetch = async () => new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify({
            text: 'Recovered localized page',
            strings: { 'common.missed': 'Recovered localized UI', 'common.later': 'Pending later UI' }
          }) }] } }]
        }))\n`)
        execFileSync(process.execPath, [
          '--import', pathToFileURL(mockVertex).href, ...args, ...pendingArgs,
        ], {
          cwd: dir,
          encoding: 'utf8',
          env: { ...process.env, GCP_ACCESS_TOKEN: 'test-token', GCP_PROJECT_ID: 'test-project' },
        })
        const translated = JSON.parse(readFileSync(join(dir, targetJson), 'utf8'))
        assert.equal(translated.common.keep, 'Reviewed pending UI')
        assert.equal(translated.common.later, 'Pending later UI')
        assert.equal(translated.common.missed, olderRequest ? 'Recovered localized UI' : 'Old localized UI')
        assert.equal(readFileSync(join(dir, targetPage), 'utf8'), 'Recovered localized page\n')
        assert.equal(readFileSync(join(dir, sourceJson), 'utf8'), JSON.stringify(english))
        assert.equal(readFileSync(join(dir, sourcePage), 'utf8'), olderRequest ? 'Missed English page\n' : 'Newest English page\n')
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  }

  it('keeps locale edits from an open branch and ignores English paths', () => {
    const selected = selectPendingFiles(
      [
        'M\tpackages/frontend/content/ja/misc/changelog.md',
        'D\tpackages/frontend/content/pl/announcements/old.md',
        'M\tpackages/frontend/content/en/misc/changelog.md',
        'M\tpackages/frontend/i18n/locales/en-us.json',
        'M\tpackages/frontend/i18n/locales/fr-fr.json',
      ].join('\n'),
    )
    assert.deepEqual(selected.checkout, [
      'packages/frontend/content/ja/misc/changelog.md',
      'packages/frontend/i18n/locales/fr-fr.json',
    ])
    assert.deepEqual(selected.remove, ['packages/frontend/content/pl/announcements/old.md'])
  })

  it('keeps a reviewed locale fix when merging an open translation branch', () => {
    const merged = mergeLocaleContents(
      'packages/frontend/i18n/locales/ja-jp.json',
      JSON.stringify({ common: { a: 'old', b: 'old' } }, null, 2) + '\n',
      JSON.stringify({ common: { a: 'reviewed', b: 'old' } }, null, 2) + '\n',
      JSON.stringify({ common: { a: 'old', b: 'translated' } }, null, 2) + '\n',
    )
    const parsed = JSON.parse(merged ?? '{}') as { common: { a: string; b: string } }
    assert.equal(parsed.common.a, 'reviewed')
    assert.equal(parsed.common.b, 'translated')
  })

  it('plans from the last translated commit without writing during a preview', () => {
    const dir = mkdtempSync(join(tmpdir(), 'i18n-pending-'))
    const git = (args: string[]) =>
      execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const write = (path: string, contents: string) => {
      mkdirSync(join(dir, path, '..'), { recursive: true })
      writeFileSync(join(dir, path), contents)
    }
    const note = 'packages/frontend/content/ja/misc/note.md'
    try {
      git(['init', '-b', 'main'])
      git(['config', 'user.email', 'test@example.com'])
      git(['config', 'user.name', 'Test'])
      write('packages/frontend/content/en/misc/note.md', 'English one\n')
      write(note, '# Note\n\nSame.\n\nOld pending.\n')
      git(['add', '.'])
      git(['commit', '-m', 'base'])
      const translatedBase = git(['rev-parse', 'HEAD']).trim()
      git(['checkout', '-b', 'i18n/update-translations'])
      write(note, '# Note\n\nSame.\n\nNew pending.\n')
      git(['add', '.'])
      git(['commit', '-m', 'chore(i18n): update translations'])
      git(['checkout', 'main'])
      write('packages/frontend/content/en/misc/note.md', 'English two\n')
      write(note, '# Note\n\nReviewed fix.\n\nOld pending.\n')
      git(['add', '.'])
      git(['commit', '-m', 'reviewed fix'])
      const pending = loadPendingTranslations('i18n/update-translations', dir)
      assert.equal(pending?.base, translatedBase)
      assert.equal(readFileSync(join(dir, note), 'utf8'), '# Note\n\nReviewed fix.\n\nOld pending.\n')
      assert.match(pending?.files.get(note) ?? '', /Reviewed fix/)
      assert.match(pending?.files.get(note) ?? '', /New pending/)
      assert.doesNotMatch(pending?.files.get(note) ?? '', /Old pending/)
      materializePendingTranslations(pending!, dir)
      assert.match(readFileSync(join(dir, note), 'utf8'), /Reviewed fix/)
      assert.match(readFileSync(join(dir, note), 'utf8'), /New pending/)
      assert.equal(readFileSync(join(dir, 'packages/frontend/content/en/misc/note.md'), 'utf8'), 'English two\n')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
