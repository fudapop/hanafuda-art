/**
 * Keep translations that are already on the open `i18n/update-translations` branch.
 * Pending edits are merged with the current locale files. A reviewed fix on main
 * stays when the English source of that string did not change. Files are written
 * only when translations are applied, not while printing a plan.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  CONTENT_ROOT,
  ENGLISH_CONTENT_PREFIX,
  ENGLISH_JSON_PATH,
  JSON_DIR,
  LOCALIZATION_PATH,
  isCommitSha,
} from './paths.ts'
import { parseNameStatus, type Snapshot } from './plan.ts'
import type { JsonObject, JsonValue } from './json-locale.ts'

export const TRANSLATION_BRANCH = 'i18n/update-translations'

export type PendingTranslations = {
  base: string
  /** Merged locale contents. Null deletes the file. */
  files: Map<string, string | null>
}

const git = (args: string[], cwd: string): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const refExists = (ref: string, cwd: string): boolean => {
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd)
    return true
  } catch {
    return false
  }
}

const gitShow = (ref: string, filePath: string, cwd: string): string | null => {
  const result = spawnSync('git', ['show', `${ref}:${filePath}`], { cwd, encoding: 'utf8' })
  if (result.status !== 0) return null
  return result.stdout
}

const readWorktree = (filePath: string, cwd: string): string | null => {
  try {
    return readFileSync(join(cwd, filePath), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

/**
 * Locale files a translation branch may contribute. English sources are never included.
 *
 * @param filePath - Path relative to the repository root.
 * @returns True for translated content and UI locale files.
 */
export const isPendingLocalePath = (filePath: string): boolean => {
  if (
    filePath.startsWith(ENGLISH_CONTENT_PREFIX) ||
    filePath === ENGLISH_JSON_PATH ||
    filePath === LOCALIZATION_PATH
  ) {
    return false
  }
  return filePath.startsWith(CONTENT_ROOT) || filePath.startsWith(JSON_DIR)
}

/**
 * @param nameStatus - `git diff --name-status` from the last translated commit to the translation branch.
 * @returns Locale paths changed on that branch, and locale paths it deleted.
 */
export const selectPendingFiles = (nameStatus: string): { checkout: string[]; remove: string[] } => {
  const checkout: string[] = []
  const remove: string[] = []
  for (const change of parseNameStatus(nameStatus)) {
    if (change.status === 'R') {
      if (isPendingLocalePath(change.from)) remove.push(change.from)
      if (isPendingLocalePath(change.to)) checkout.push(change.to)
      continue
    }
    if (!isPendingLocalePath(change.path)) continue
    if (change.status === 'D') remove.push(change.path)
    else checkout.push(change.path)
  }
  return { checkout, remove }
}

const isObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const jsonEqual = (left: JsonValue | undefined, right: JsonValue | undefined): boolean => {
  if (left === right) return true
  if (typeof left !== typeof right || left === null || right === null) return false
  if (typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) || Array.isArray(right)) return JSON.stringify(left) === JSON.stringify(right)
  const leftObject = left as JsonObject
  const rightObject = right as JsonObject
  const keys = new Set([...Object.keys(leftObject), ...Object.keys(rightObject)])
  for (const key of keys) {
    if (!jsonEqual(leftObject[key], rightObject[key])) return false
  }
  return true
}

const mergeObjects = (
  base: JsonObject | null,
  current: JsonObject,
  pending: JsonObject,
): JsonObject => {
  const result = JSON.parse(JSON.stringify(current)) as JsonObject
  const keys = new Set([...Object.keys(base ?? {}), ...Object.keys(current), ...Object.keys(pending)])
  for (const key of keys) {
    const baseValue = base ? base[key] : undefined
    const currentValue = current[key]
    const pendingValue = pending[key]
    if (isObject(pendingValue) && isObject(currentValue) && (baseValue === undefined || isObject(baseValue))) {
      result[key] = mergeObjects(isObject(baseValue) ? baseValue : null, currentValue, pendingValue)
      continue
    }
    const pendingChanged = !jsonEqual(baseValue, pendingValue)
    const currentChanged = !jsonEqual(baseValue, currentValue)
    if (!pendingChanged) continue
    if (currentChanged && !jsonEqual(currentValue, pendingValue)) continue
    if (pendingValue === undefined) delete result[key]
    else result[key] = JSON.parse(JSON.stringify(pendingValue)) as JsonValue
  }
  return result
}

const mergeText = (current: string, base: string, pending: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'i18n-merge-'))
  try {
    const currentPath = join(dir, 'current')
    const basePath = join(dir, 'base')
    const pendingPath = join(dir, 'pending')
    writeFileSync(currentPath, current)
    writeFileSync(basePath, base)
    writeFileSync(pendingPath, pending)
    const result = spawnSync(
      'git',
      ['merge-file', '-p', '--ours', currentPath, basePath, pendingPath],
      { encoding: 'utf8' },
    )
    if (result.error || result.status === null || result.status > 127) {
      throw new Error(result.stderr || 'git merge-file failed')
    }
    if (result.stdout.includes('<<<<<<<')) throw new Error('Locale merge left conflict markers')
    return result.stdout
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Combine an open translation with the locale file currently on main.
 * Pending edits apply where main still matches the last translated commit.
 * A main edit of the same text wins.
 *
 * @param filePath - Locale path. JSON files are merged by key. Other files use a text merge.
 * @param base - Contents at the last translated commit, or null if the file was new.
 * @param current - Contents on the current main commit, or null if main does not have the file.
 * @param pending - Contents on the translation branch, or null if that branch deletes the file.
 * @returns Merged contents, or null when the file should be deleted.
 */
export const mergeLocaleContents = (
  filePath: string,
  base: string | null,
  current: string | null,
  pending: string | null,
): string | null => {
  if (pending === null) {
    if (current === null || base === null || current === base) return null
    return current
  }
  if (current === null) return base === null ? pending : null
  if (base === null || current === base) return pending
  if (pending === base || current === pending) return current
  if (filePath.endsWith('.json')) {
    try {
      const merged = mergeObjects(
        JSON.parse(base) as JsonObject,
        JSON.parse(current) as JsonObject,
        JSON.parse(pending) as JsonObject,
      )
      return JSON.stringify(merged, null, 2) + '\n'
    } catch {
      return mergeText(current, base, pending)
    }
  }
  return mergeText(current, base, pending)
}

/**
 * Read the open translation branch and merge its locale edits with the working tree.
 * Does not write files.
 *
 * @param ref - Git ref such as `origin/i18n/update-translations`. Missing refs are ignored.
 * @param cwd - Repository root. Defaults to the process working directory.
 * @returns The merge-base and merged locale contents. Null when `ref` does not exist.
 * @throws When the ref exists but `merge-base` does not return a commit id.
 */
export const loadPendingTranslations = (ref: string, cwd = process.cwd()): PendingTranslations | null => {
  if (!refExists(ref, cwd)) return null
  const base = git(['merge-base', ref, 'HEAD'], cwd).trim()
  if (!isCommitSha(base)) throw new Error(`merge-base of ${ref} and HEAD is not a commit: ${base}`)
  const status = git(['diff', '--name-status', '--find-renames', base, ref], cwd)
  const { checkout, remove } = selectPendingFiles(status)
  const files = new Map<string, string | null>()
  for (const filePath of new Set([...checkout, ...remove])) {
    files.set(
      filePath,
      mergeLocaleContents(
        filePath,
        gitShow(base, filePath, cwd),
        readWorktree(filePath, cwd),
        gitShow(ref, filePath, cwd),
      ),
    )
  }
  return { base, files }
}

/**
 * Write merged locale files. Skips files that already match the working tree.
 *
 * @param pending - Result of {@link loadPendingTranslations}.
 * @param cwd - Repository root. Defaults to the process working directory.
 */
export const materializePendingTranslations = (
  pending: PendingTranslations,
  cwd = process.cwd(),
): void => {
  for (const [filePath, contents] of pending.files) {
    const absolute = join(cwd, filePath)
    if (contents === null) {
      rmSync(absolute, { force: true })
      continue
    }
    if (readWorktree(filePath, cwd) === contents) continue
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, contents)
  }
}

/**
 * @param snapshot - Reads the current checkout.
 * @param pending - Merged locale files from the open translation branch.
 * @returns A snapshot whose locale reads include those merged files.
 */
export const snapshotWithPending = (snapshot: Snapshot, pending: PendingTranslations): Snapshot => ({
  read: (filePath) => (pending.files.has(filePath) ? (pending.files.get(filePath) ?? null) : snapshot.read(filePath)),
  listMarkdown: () => snapshot.listMarkdown(),
})
