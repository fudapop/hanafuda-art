/**
 * Repository paths for English sources and generated translations.
 * Targets are derived from locale config. English sources are never write targets.
 */

export const LOCALIZATION_PATH = 'packages/frontend/localization.json'
export const ENGLISH_JSON_PATH = 'packages/frontend/i18n/locales/en-us.json'
export const ENGLISH_CONTENT_PREFIX = 'packages/frontend/content/en/'
export const CONTENT_ROOT = 'packages/frontend/content/'
export const JSON_DIR = 'packages/frontend/i18n/locales/'

const SHA = /^[0-9a-f]{40}$/i

/**
 * Reject path segments that could escape the repository.
 *
 * @param filePath - Path relative to the repository root.
 * @throws When the path is absolute or contains `..`.
 */
export const assertRepoPath = (filePath: string): void => {
  if (
    filePath.startsWith('/') ||
    filePath.includes('\\') ||
    filePath.split('/').some((part) => part === '..' || part === '')
  ) {
    throw new Error(`Unsafe path: ${filePath}`)
  }
}

/**
 * @param sha - Candidate git object name.
 * @returns True when `sha` is a full 40-character commit id.
 */
export const isCommitSha = (sha: string): boolean => SHA.test(sha)

/**
 * @param sha - Candidate git object name from a push event.
 * @returns True for missing values and the all-zero placeholder GitHub uses.
 */
export const isZeroSha = (sha: string | undefined): boolean => !sha || /^0+$/.test(sha)

/**
 * @param englishPath - English markdown path under `packages/frontend/content/en/`.
 * @param code - Target locale code from `localization.json`, such as `ja`.
 * @returns The matching markdown path for that locale.
 * @throws When the source is not English content or the locale code is not two letters.
 */
export const localeContentPath = (englishPath: string, code: string): string => {
  assertRepoPath(englishPath)
  if (!englishPath.startsWith(ENGLISH_CONTENT_PREFIX) || !englishPath.endsWith('.md')) {
    throw new Error(`Not an English content file: ${englishPath}`)
  }
  if (!/^[a-z]{2}$/.test(code)) throw new Error(`Unsupported locale code: ${code}`)
  return `${CONTENT_ROOT}${code}/${englishPath.slice(ENGLISH_CONTENT_PREFIX.length)}`
}

/**
 * @param file - Locale file name from `localization.json`, such as `ja-jp.json`.
 * @returns Path relative to the repository root.
 */
export const localeJsonPath = (file: string): string => {
  if (!/^[a-z]{2}-[a-z]{2}\.json$/.test(file) || file === 'en-us.json') {
    throw new Error(`Unsupported locale file: ${file}`)
  }
  return `${JSON_DIR}${file}`
}

/**
 * Guard for files the translator is allowed to create, update, or delete.
 *
 * @param filePath - Intended write or delete path.
 * @throws When the path is English source or outside the content and locale trees.
 */
export const assertTranslationTarget = (filePath: string): void => {
  assertRepoPath(filePath)
  if (
    filePath.startsWith(ENGLISH_CONTENT_PREFIX) ||
    filePath === ENGLISH_JSON_PATH ||
    filePath === LOCALIZATION_PATH
  ) {
    throw new Error(`Refusing to write English source ${filePath}`)
  }
  if (!filePath.startsWith(CONTENT_ROOT) && !filePath.startsWith(JSON_DIR)) {
    throw new Error(`Refusing to write ${filePath}`)
  }
}
