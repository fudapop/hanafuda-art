/**
 * Keep translations that are already on the open `i18n/update-translations` branch.
 * A later English push plans from the last translated commit and restores those
 * locale files before writing anything new, so the next pull request still
 * contains the earlier unmerged translations.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  CONTENT_ROOT,
  ENGLISH_CONTENT_PREFIX,
  ENGLISH_JSON_PATH,
  JSON_DIR,
  LOCALIZATION_PATH,
  isCommitSha,
} from './paths.ts'
import { parseNameStatus } from './plan.ts'

export const TRANSLATION_BRANCH = 'i18n/update-translations'

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

/**
 * Locale files a translation branch may restore. English sources are never included.
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
 * @returns Locale paths to copy back, and locale paths the branch deleted.
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

/**
 * Copy locale files from an open translation branch into the working tree.
 *
 * @param ref - Git ref such as `origin/i18n/update-translations`. Missing refs are ignored.
 * @param cwd - Repository root. Defaults to the process working directory.
 * @returns The merge-base of `ref` and `HEAD`, which is the last main commit already translated. Null when `ref` does not exist.
 * @throws When the ref exists but `merge-base` does not return a commit id.
 */
export const restorePendingTranslations = (ref: string, cwd = process.cwd()): string | null => {
  if (!refExists(ref, cwd)) return null
  const base = git(['merge-base', ref, 'HEAD'], cwd).trim()
  if (!isCommitSha(base)) throw new Error(`merge-base of ${ref} and HEAD is not a commit: ${base}`)
  const status = git(['diff', '--name-status', '--find-renames', base, ref], cwd)
  const { checkout, remove } = selectPendingFiles(status)
  for (const filePath of remove) {
    rmSync(`${cwd}/${filePath}`, { force: true })
  }
  for (const filePath of checkout) {
    const contents = git(['show', `${ref}:${filePath}`], cwd)
    const absolute = `${cwd}/${filePath}`
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, contents)
  }
  return base
}
