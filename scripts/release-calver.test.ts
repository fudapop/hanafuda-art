import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  bumpPackageVersion,
  formatUtcDate,
  getNextVersion,
  parseCalVer,
  parseReleaseDate,
  prepareRelease,
  promoteUnreleased,
  ReleaseError,
} from './release-calver-lib.ts'

const changelog = `# Changelog

## Unreleased

### Bug Fixes
- **Phone game board**: Cards fit on a phone.

## [2026.4.0] - 2026-04-05

### New Features
- **Multiplayer**: Live matches.

---
`

describe('parseCalVer', () => {
  it('parses an unpadded month', () => {
    assert.deepEqual(parseCalVer('2026.4.0'), { year: 2026, month: 4, micro: 0 })
  })

  it('rejects a semver string and a leading v', () => {
    assert.equal(parseCalVer('2.6.1'), null)
    assert.equal(parseCalVer('v2026.4.0'), null)
  })

  it('rejects a month outside 1-12', () => {
    assert.equal(parseCalVer('2026.0.1'), null)
    assert.equal(parseCalVer('2026.13.0'), null)
  })
})

describe('getNextVersion', () => {
  it('resets micro when the month changes', () => {
    const november = new Date(Date.UTC(2026, 10, 13))
    assert.equal(getNextVersion('2026.4.0', november), '2026.11.0')
  })

  it('increments micro inside the same month', () => {
    const april = new Date(Date.UTC(2026, 3, 20))
    assert.equal(getNextVersion('2026.4.0', april), '2026.4.1')
  })

  it('does not zero-pad the month', () => {
    const january = new Date(Date.UTC(2026, 0, 15))
    assert.equal(getNextVersion('2025.12.0', january), '2026.1.0')
  })

  it('starts a non-calver version at micro 1', () => {
    const october = new Date(Date.UTC(2025, 9, 30))
    assert.equal(getNextVersion('2.6.1', october), '2025.10.1')
  })

  it('uses the UTC month when local time is still the previous day', () => {
    const utcDecember = new Date('2026-12-01T00:30:00Z')
    assert.equal(getNextVersion('2026.11.0', utcDecember), '2026.12.0')
  })
})

describe('parseReleaseDate', () => {
  it('returns UTC midnight for a real date', () => {
    const date = parseReleaseDate('2026-11-13')
    assert.equal(formatUtcDate(date), '2026-11-13')
    assert.equal(date.toISOString(), '2026-11-13T00:00:00.000Z')
  })

  it('rejects impossible and partial dates', () => {
    assert.throws(() => parseReleaseDate('2026-02-31'), ReleaseError)
    assert.throws(() => parseReleaseDate('2026-11'), ReleaseError)
    assert.throws(() => parseReleaseDate(undefined), ReleaseError)
  })
})

describe('promoteUnreleased', () => {
  it('moves Unreleased into a dated heading and keeps later sections', () => {
    const next = promoteUnreleased(changelog, '2026.11.0', '2026-11-13')
    assert.equal(
      next,
      `# Changelog

## [2026.11.0] - 2026-11-13

### Bug Fixes
- **Phone game board**: Cards fit on a phone.

## [2026.4.0] - 2026-04-05

### New Features
- **Multiplayer**: Live matches.

---
`,
    )
  })

  it('fails when Unreleased is missing, empty, or duplicated', () => {
    assert.throws(
      () => promoteUnreleased('# Changelog\n\n## [2026.4.0]\n', '2026.11.0', '2026-11-13'),
      /no "## Unreleased"/,
    )
    assert.throws(
      () =>
        promoteUnreleased(
          '# Changelog\n\n## Unreleased\n\n## [2026.4.0]\n',
          '2026.11.0',
          '2026-11-13',
        ),
      /empty/,
    )
    assert.throws(
      () =>
        promoteUnreleased(
          '## Unreleased\n\n- a\n\n## Unreleased\n\n- b\n',
          '2026.11.0',
          '2026-11-13',
        ),
      /more than one/,
    )
  })

  it('fails when that version heading already exists', () => {
    assert.throws(
      () => promoteUnreleased(changelog, '2026.4.0', '2026-11-13'),
      /already has a 2026.4.0/,
    )
  })
})

describe('bumpPackageVersion', () => {
  it('changes only the version and keeps a trailing newline', () => {
    const original = `{
  "name": "@hanafuda/frontend",
  "version": "2026.4.0",
  "private": true
}
`
    const next = bumpPackageVersion(original, '2026.11.0')
    assert.equal(JSON.parse(next).name, '@hanafuda/frontend')
    assert.equal(JSON.parse(next).private, true)
    assert.equal(JSON.parse(next).version, '2026.11.0')
    assert.equal(next.endsWith('\n'), true)
  })

  it('rejects JSON without a version string', () => {
    assert.throws(() => bumpPackageVersion('{"name":"x"}\n', '2026.11.0'), /no string version/)
    assert.throws(() => bumpPackageVersion('not json', '2026.11.0'), /not valid JSON/)
  })
})

describe('prepareRelease', () => {
  it('bumps the frontend version and the changelog together', () => {
    const prepared = prepareRelease({
      packageJson: '{"name":"@hanafuda/frontend","version":"2026.4.0"}\n',
      changelog,
      now: parseReleaseDate('2026-11-13'),
    })
    assert.equal(prepared.currentVersion, '2026.4.0')
    assert.equal(prepared.version, '2026.11.0')
    assert.equal(prepared.date, '2026-11-13')
    assert.equal(JSON.parse(prepared.packageJson).version, '2026.11.0')
    assert.match(prepared.changelog, /^# Changelog\n\n## \[2026\.11\.0\] - 2026-11-13\n/)
    assert.doesNotMatch(prepared.changelog, /^## Unreleased/m)
    assert.match(prepared.changelog, /## \[2026\.4\.0\] - 2026-04-05/)
  })
})
