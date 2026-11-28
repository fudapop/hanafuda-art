# Agent instructions

Follow [CLAUDE.md](./CLAUDE.md) before changing this repository. The release rules below are required; the Releases section there has the version format, changelog style, and tag commands.

- Do not bump `packages/frontend/package.json` `version` in a normal pull request. That field is the version players see.
- A player-visible change adds one bullet under `## Recent changes` in `packages/frontend/content/en/misc/changelog.md`. Docs, CI, tests, and refactors do not.
- Releases are cut every Sunday at 00:00 UTC by `.github/workflows/release.yml`, and when that workflow is run manually. `pnpm release` still prepares the version bump locally: it moves `Recent changes` into a dated section and leaves an empty `## Recent changes` heading. The workflow tags `vYYYY.M.MICRO` after the release commit reaches `main`. Do not tag by hand.
