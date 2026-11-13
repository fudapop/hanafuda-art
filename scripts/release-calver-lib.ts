/**
 * @fileoverview Pure helpers for calendar-version releases.
 *
 * The player-facing version is `packages/frontend/package.json`. It uses
 * `YYYY.M.MICRO` (month is not zero-padded): the first release in a month is
 * `.0`, and later releases that month increment MICRO. These helpers compute
 * the next version and move an `## Unreleased` changelog section into a dated
 * heading. They do not touch git.
 *
 * @example
 * const prepared = prepareRelease({
 *   packageJson: '{"version":"2026.4.0"}',
 *   changelog: '# Changelog\n\n## Unreleased\n\n- **Fix**: A fix.\n',
 *   now: new Date(Date.UTC(2026, 10, 13)),
 * })
 * prepared.version // "2026.11.0"
 */

export class ReleaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReleaseError'
  }
}

export type CalVer = {
  year: number
  month: number
  micro: number
}

const CALVER = /^(\d{4})\.(\d{1,2})\.(\d+)$/
const RELEASE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Parse a `YYYY.M.MICRO` version.
 *
 * @param version - Version string without a leading `v`.
 * @returns The parsed version, or `null` when it is not CalVer.
 */
export const parseCalVer = (version: string): CalVer | null => {
  const match = CALVER.exec(version)
  if (!match) return null
  const month = parseInt(match[2], 10)
  if (month < 1 || month > 12) return null
  return {
    year: parseInt(match[1], 10),
    month,
    micro: parseInt(match[3], 10),
  }
}

/**
 * Format a CalVer value the way existing tags and changelog headings do.
 *
 * @param version - Parsed calendar version.
 * @returns Unpadded `YYYY.M.MICRO`, for example `2026.4.0`.
 */
export const formatCalVer = (version: CalVer): string =>
  `${version.year}.${version.month}.${version.micro}`

/**
 * Format a UTC calendar date as `YYYY-MM-DD`.
 *
 * @param now - Instant whose UTC calendar date is used.
 * @returns Zero-padded UTC date.
 */
export const formatUtcDate = (now: Date): string => {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a `YYYY-MM-DD` release date as UTC midnight.
 *
 * @param value - Calendar date. Month and day are zero-padded.
 * @returns UTC midnight on that date.
 * @throws {ReleaseError} When the date is missing, malformed, or not a real day.
 */
export const parseReleaseDate = (value: string | undefined): Date => {
  if (!value) {
    throw new ReleaseError('Missing date after --date. Use YYYY-MM-DD.')
  }
  const match = RELEASE_DATE.exec(value)
  if (!match) {
    throw new ReleaseError(`Release date must be YYYY-MM-DD, got "${value}".`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ReleaseError(`"${value}" is not a real calendar date.`)
  }
  return date
}

/**
 * Next calendar version relative to `now` (UTC year and month).
 *
 * Same month increments MICRO. A new month or year resets MICRO to 0.
 * A version that is not CalVer starts at `YYYY.M.1`, which is how `2.6.1`
 * became `2025.10.1`.
 *
 * @param currentVersion - Version currently in the frontend package.json.
 * @param now - Instant that selects the year and month. UTC, not local time.
 * @returns The next `YYYY.M.MICRO` string.
 */
export const getNextVersion = (currentVersion: string, now: Date): string => {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const parsed = parseCalVer(currentVersion)

  if (!parsed) {
    return `${year}.${month}.1`
  }
  if (parsed.year === year && parsed.month === month) {
    return `${year}.${month}.${parsed.micro + 1}`
  }
  return `${year}.${month}.0`
}

/**
 * Replace `## Unreleased` with a dated version heading.
 *
 * @param markdown - English changelog markdown.
 * @param version - CalVer string already validated by the caller, or validated here.
 * @param date - `YYYY-MM-DD` release date.
 * @returns Changelog with one new version section and no Unreleased heading.
 * @throws {ReleaseError} When Unreleased is missing, empty, duplicated,
 * or the version heading already exists.
 */
export const promoteUnreleased = (markdown: string, version: string, date: string): string => {
  if (!parseCalVer(version)) {
    throw new ReleaseError(`Version must be CalVer YYYY.M.MICRO, got "${version}".`)
  }
  if (!RELEASE_DATE.test(date)) {
    throw new ReleaseError(`Release date must be YYYY-MM-DD, got "${date}".`)
  }

  const normalized = markdown.replace(/\r\n/g, '\n')
  // Fresh regex each call. A shared global regex keeps lastIndex between runs.
  const headings = [...normalized.matchAll(/^## Unreleased[ \t]*$/gm)]
  if (headings.length === 0) {
    throw new ReleaseError(
      'Changelog has no "## Unreleased" section. Add player-facing notes before cutting a release.',
    )
  }
  if (headings.length > 1) {
    throw new ReleaseError('Changelog has more than one "## Unreleased" section.')
  }
  if (normalized.includes(`## [${version}]`)) {
    throw new ReleaseError(`Changelog already has a ${version} section.`)
  }

  const heading = headings[0]
  const start = heading.index ?? 0
  const bodyStart = start + heading[0].length
  const relativeNext = normalized.slice(bodyStart).search(/\n## /)
  const body =
    relativeNext === -1
      ? normalized.slice(bodyStart)
      : normalized.slice(bodyStart, bodyStart + relativeNext)
  const rest = relativeNext === -1 ? '' : normalized.slice(bodyStart + relativeNext + 1)
  const notes = body.trim()
  if (!notes) {
    throw new ReleaseError('The Unreleased section is empty.')
  }

  const prefix = start === 0 ? '' : normalized.slice(0, start).replace(/\s*$/, '\n\n')
  const section = `## [${version}] - ${date}\n\n${notes}\n\n`
  return `${prefix}${section}${rest}`.replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n')
}

/**
 * Set the `version` field of a package.json document.
 *
 * @param pkgText - Raw package.json text.
 * @param version - New version string.
 * @returns Pretty-printed package.json with a trailing newline.
 * @throws {ReleaseError} When the file is not JSON or has no string `version`.
 */
export const bumpPackageVersion = (pkgText: string, version: string): string => {
  let pkg: { version?: unknown }
  try {
    pkg = JSON.parse(pkgText)
  } catch {
    throw new ReleaseError('package.json is not valid JSON.')
  }
  if (typeof pkg.version !== 'string') {
    throw new ReleaseError('package.json has no string version field.')
  }
  pkg.version = version
  return `${JSON.stringify(pkg, null, 2)}\n`
}

export type PreparedRelease = {
  currentVersion: string
  version: string
  date: string
  packageJson: string
  changelog: string
}

/**
 * Compute the next release from the frontend package.json and English changelog.
 *
 * @param input.packageJson - Raw `packages/frontend/package.json`.
 * @param input.changelog - Raw English changelog.
 * @param input.now - UTC instant that selects the version month and changelog date.
 * @returns The next version and the rewritten file contents. Nothing is written.
 * @throws {ReleaseError} When either file cannot be released as-is.
 */
export const prepareRelease = (input: {
  packageJson: string
  changelog: string
  now: Date
}): PreparedRelease => {
  let pkg: { version?: unknown }
  try {
    pkg = JSON.parse(input.packageJson)
  } catch {
    throw new ReleaseError('package.json is not valid JSON.')
  }
  if (typeof pkg.version !== 'string') {
    throw new ReleaseError('package.json has no string version field.')
  }

  const version = getNextVersion(pkg.version, input.now)
  const date = formatUtcDate(input.now)
  return {
    currentVersion: pkg.version,
    version,
    date,
    packageJson: bumpPackageVersion(input.packageJson, version),
    changelog: promoteUnreleased(input.changelog, version, date),
  }
}
