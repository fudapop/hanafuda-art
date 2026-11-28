#!/usr/bin/env node

/**
 * Prepare a calendar-version release.
 *
 * Updates the player-facing version in `packages/frontend/package.json` and
 * moves the notes under `## Recent changes` in the English changelog to
 * `## [YYYY.M.MICRO] - YYYY-MM-DD` and leaves an empty `## Recent changes`
 * heading in place. Does not commit, tag, or push. The Release workflow tags
 * `vYYYY.M.MICRO` after that pull request squash-merges to main. See CLAUDE.md, Releases.
 *
 * Usage:
 *   pnpm release
 *   pnpm release:dry-run
 *   node --experimental-strip-types scripts/release-calver.ts --date 2026-11-13
 *   node --experimental-strip-types scripts/release-calver.ts --dry-run
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseReleaseDate, prepareRelease, ReleaseError } from './release-calver-lib.ts'

const PACKAGE_JSON = 'packages/frontend/package.json'
const CHANGELOG = 'packages/frontend/content/en/misc/changelog.md'

type CliOptions = {
  dryRun: boolean
  date: Date
}

/**
 * Read `--dry-run`, `-d`, `--help`, and `--date YYYY-MM-DD`.
 *
 * @param argv - Arguments after the node binary and script path.
 * @returns Parsed options. `--date` defaults to the current UTC day.
 * @throws {ReleaseError} When an argument is unknown or the date is invalid.
 */
const parseArgs = (argv: string[]): CliOptions => {
  let dryRun = false
  let date = new Date()

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run' || arg === '-d') {
      dryRun = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Prepare a CalVer release (no commit, no tag, no push).

  pnpm release                  Rewrite the version and changelog
  pnpm release:dry-run          Print the next version without writing
  --date YYYY-MM-DD             Use this UTC calendar date instead of today
`)
      process.exit(0)
    } else if (arg === '--date') {
      date = parseReleaseDate(argv[++i])
    } else if (arg.startsWith('--date=')) {
      date = parseReleaseDate(arg.slice('--date='.length))
    } else {
      throw new ReleaseError(`Unknown argument "${arg}". Try --help.`)
    }
  }

  return { dryRun, date }
}

const main = () => {
  const { dryRun, date } = parseArgs(process.argv.slice(2))
  const root = join(import.meta.dirname, '..')
  const packagePath = join(root, PACKAGE_JSON)
  const changelogPath = join(root, CHANGELOG)
  const prepared = prepareRelease({
    packageJson: readFileSync(packagePath, 'utf8'),
    changelog: readFileSync(changelogPath, 'utf8'),
    now: date,
  })

  console.log(dryRun ? 'CalVer release (dry run)\n' : 'CalVer release\n')
  console.log(`Current version: ${prepared.currentVersion}`)
  console.log(`Next version:    ${prepared.version}`)
  console.log(`Changelog date:  ${prepared.date}\n`)

  if (dryRun) {
    console.log(`Would update ${PACKAGE_JSON}`)
    console.log(
      `Would move notes under ## Recent changes to ## [${prepared.version}] - ${prepared.date}`,
    )
    console.log('Would leave an empty ## Recent changes heading in place')
    console.log(`  in ${CHANGELOG}`)
    console.log('\nNo files written.')
  } else {
    writeFileSync(packagePath, prepared.packageJson)
    writeFileSync(changelogPath, prepared.changelog)
    console.log(`Updated ${PACKAGE_JSON}`)
    console.log(`Updated ${CHANGELOG}`)
  }

  if (!dryRun) {
    console.log(`
Prepared ${PACKAGE_JSON} and ${CHANGELOG}.
## Recent changes is empty again, ready for the next notes.
Other locale changelogs stay as they are until translate-content runs.
`)
  }

  console.log(`
The Sunday Release workflow, and a manual run of that workflow, commits these
files on release/v${prepared.version}, opens a pull request titled
chore(release): v${prepared.version}, squash-merges it, and tags that version
on main. A local run does not commit, tag, or push. Do not tag the pull request branch.
`)
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Release failed: ${message}`)
  process.exit(1)
}
