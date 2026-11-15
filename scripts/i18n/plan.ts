/**
 * Build a translation plan from a full backfill or from the git diff of one push.
 * English sources are read-only. Each target locale in localization.json is planned
 * on its own, so an unchanged string in one locale is not rewritten.
 */

import { planJsonEdits, type JsonEdit, type JsonObject } from './json-locale.ts'
import { addedLocaleCodes, parseLocalization, targetLocales, type LocaleConfig } from './locales.ts'
import { planMarkdownFile, type MarkdownUpdate } from './markdown.ts'
import type { Glossary } from './glossary.ts'
import {
  ENGLISH_CONTENT_PREFIX,
  ENGLISH_JSON_PATH,
  LOCALIZATION_PATH,
  localeContentPath,
  localeJsonPath,
} from './paths.ts'

export type Change =
  | { status: 'A' | 'M' | 'D'; path: string }
  | { status: 'R'; from: string; to: string }

export type Snapshot = {
  read(path: string): string | null
  listMarkdown(): string[]
}

export type DeleteUpdate = { kind: 'delete'; targetPath: string }

export type JsonUpdate = {
  kind: 'json'
  locale: string
  targetPath: string
  existingRaw: string | null
  edits: JsonEdit[]
}

export type FileUpdate = MarkdownUpdate | JsonUpdate | DeleteUpdate

export type Plan = {
  mode: 'changed' | 'full'
  locales: string[]
  files: FileUpdate[]
}

const isSafePath = (filePath: string): boolean =>
  filePath.length > 0 &&
  !filePath.startsWith('/') &&
  !filePath.includes(':') &&
  !filePath.split('/').includes('..')

/**
 * Parse `git diff --name-status` output, including rename lines.
 * Paths that leave the repository are ignored.
 *
 * @param output - Porcelain name-status text.
 * @returns Changes limited to paths git printed. Rename and copy lines keep both paths.
 */
export const parseNameStatus = (output: string): Change[] => {
  const changes: Change[] = []
  for (const line of output.split('\n')) {
    if (!line.trim()) continue
    const parts = line.split('\t')
    const status = parts[0] ?? ''
    if (status.startsWith('R') || status.startsWith('C')) {
      if (!parts[1] || !parts[2] || !isSafePath(parts[1]) || !isSafePath(parts[2])) continue
      changes.push({ status: 'R', from: parts[1], to: parts[2] })
      continue
    }
    const path = parts[1]
    if (!path || !isSafePath(path)) continue
    if (status.startsWith('A')) changes.push({ status: 'A', path })
    else if (status.startsWith('D')) changes.push({ status: 'D', path })
    else if (status.startsWith('M') || status.startsWith('T')) changes.push({ status: 'M', path })
  }
  return changes
}

const readJson = (snapshot: Snapshot, path: string): JsonObject | null => {
  const raw = snapshot.read(path)
  if (raw === null) return null
  const parsed = JSON.parse(raw) as JsonObject
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Expected a JSON object at ${path}`)
  }
  return parsed
}

const planLocaleJson = (
  locale: LocaleConfig,
  before: JsonObject | null,
  after: JsonObject,
  existingRaw: string | null,
  mode: 'changed' | 'full',
  glossary: Glossary,
): JsonUpdate | null => {
  const existing = existingRaw ? (JSON.parse(existingRaw) as JsonObject) : null
  const edits = planJsonEdits({ before, after, existing, mode, glossary, locale: locale.code })
  if (edits.length === 0) return null
  return {
    kind: 'json',
    locale: locale.code,
    targetPath: localeJsonPath(locale.file),
    existingRaw,
    edits,
  }
}

const planContent = (
  locale: LocaleConfig,
  sourcePath: string,
  before: string | null,
  after: string | null,
  existing: string | null,
  mode: 'changed' | 'full',
  glossary: Glossary,
): FileUpdate | null => {
  const planned = planMarkdownFile({
    mode,
    locale: locale.code,
    sourcePath,
    targetPath: localeContentPath(sourcePath, locale.code),
    before,
    after,
    existing,
    glossary,
  })
  if (!planned) return null
  if (planned.kind === 'delete') return planned
  return planned
}

/**
 * @param mode - `full` plans every English markdown file and every UI string.
 * `changed` plans files from `changes`, and also fills locale keys that are still missing
 * in a JSON file that this push edited.
 * @param changes - Name-status entries. Ignored for `full`.
 * @param before - Tree at the parent commit. Ignored for `full`.
 * @param after - Tree at the commit being translated.
 * @param glossary - Canonical hanafuda terms.
 * @returns Files to write or delete. English paths are not included.
 */
export const buildPlan = (args: {
  mode: 'changed' | 'full'
  changes: Change[]
  before: Snapshot | null
  after: Snapshot
  glossary: Glossary
}): Plan => {
  const localizationRaw = args.after.read(LOCALIZATION_PATH)
  if (!localizationRaw) throw new Error(`Missing ${LOCALIZATION_PATH}`)
  const localization = parseLocalization(localizationRaw)
  const locales = targetLocales(localization)
  const files: FileUpdate[] = []
  const englishJson = readJson(args.after, ENGLISH_JSON_PATH)
  if (!englishJson) throw new Error(`Missing ${ENGLISH_JSON_PATH}`)

  const planFullLocale = (locale: LocaleConfig) => {
    const json = planLocaleJson(
      locale,
      null,
      englishJson,
      args.after.read(localeJsonPath(locale.file)),
      'full',
      args.glossary,
    )
    if (json) files.push(json)
    for (const sourcePath of args.after.listMarkdown()) {
      const update = planContent(
        locale,
        sourcePath,
        null,
        args.after.read(sourcePath),
        args.after.read(localeContentPath(sourcePath, locale.code)),
        'full',
        args.glossary,
      )
      if (update) files.push(update)
    }
  }

  if (args.mode === 'full') {
    for (const locale of locales) planFullLocale(locale)
    return { mode: 'full', locales: locales.map((locale) => locale.code), files }
  }

  const previousRaw = args.before?.read(LOCALIZATION_PATH) ?? null
  const newCodes = new Set(
    addedLocaleCodes(previousRaw ? parseLocalization(previousRaw) : null, localization),
  )
  for (const locale of locales) {
    if (newCodes.has(locale.code)) planFullLocale(locale)
  }

  const incremental = locales.filter((locale) => !newCodes.has(locale.code))
  const englishBefore = args.before ? readJson(args.before, ENGLISH_JSON_PATH) : null
  let jsonTouched = false

  const handleEnglish = (status: 'A' | 'M' | 'D', path: string) => {
    if (path === ENGLISH_JSON_PATH) {
      jsonTouched = true
      return
    }
    if (!path.startsWith(ENGLISH_CONTENT_PREFIX) || !path.endsWith('.md')) return
    for (const locale of incremental) {
      const before = status === 'A' || !args.before ? null : args.before.read(path)
      const after = status === 'D' ? null : args.after.read(path)
      const existing = args.after.read(localeContentPath(path, locale.code))
      const update = planContent(locale, path, before, after, existing, 'changed', args.glossary)
      if (update) files.push(update)
    }
  }

  for (const change of args.changes) {
    if (change.status === 'R') {
      handleEnglish('D', change.from)
      handleEnglish('A', change.to)
      continue
    }
    handleEnglish(change.status, change.path)
  }

  if (jsonTouched) {
    for (const locale of incremental) {
      const update = planLocaleJson(
        locale,
        englishBefore,
        englishJson,
        args.after.read(localeJsonPath(locale.file)),
        'changed',
        args.glossary,
      )
      if (update) files.push(update)
    }
  }

  return { mode: 'changed', locales: locales.map((locale) => locale.code), files }
}

/**
 * Upper bound on Vertex calls for a plan. String leaves are grouped in batches of 40.
 *
 * @param plan - Plan from {@link buildPlan}.
 * @returns Number of model requests `runPlan` will make.
 */
export const countApiCalls = (plan: Plan): number => {
  let calls = 0
  for (const file of plan.files) {
    if (file.kind === 'delete') continue
    if (file.kind === 'markdown') {
      calls += file.prose.length
      if (file.strings.some((edit) => edit.keep === undefined)) calls += 1
      continue
    }
    const strings = file.edits.filter((edit) => edit.op === 'set' && edit.keep === undefined).length
    if (strings > 0) calls += Math.ceil(strings / 40)
  }
  return calls
}

/**
 * @param plan - Plan from {@link buildPlan}.
 * @returns A short log Andre can read in the Actions log before any API call.
 */
export const formatPlan = (plan: Plan): string => {
  const lines = [
    `Translation plan (${plan.mode})`,
    `Locales: ${plan.locales.join(', ')}`,
  ]
  if (plan.files.length === 0) {
    lines.push('No files need translation.')
    return lines.join('\n')
  }
  for (const file of plan.files) {
    if (file.kind === 'delete') {
      lines.push(`- delete ${file.targetPath}`)
      continue
    }
    if (file.kind === 'markdown') {
      const prose = file.prose.length
      const strings = file.strings.filter((edit) => edit.keep === undefined).length
      lines.push(`- markdown ${file.targetPath} prose=${prose} strings=${strings}`)
      continue
    }
    const strings = file.edits.filter((edit) => edit.op === 'set' && edit.keep === undefined).length
    lines.push(`- json ${file.targetPath} strings=${strings}`)
  }
  lines.push(`Files: ${plan.files.length}`)
  lines.push(`API calls, at most: ${countApiCalls(plan)}`)
  return lines.join('\n')
}
