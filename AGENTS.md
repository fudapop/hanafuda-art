# Agent instructions

Follow [CLAUDE.md](./CLAUDE.md) before changing this repository. The release rules below are required; the Releases section there has the version format, changelog style, and tag commands.

- Do not bump `packages/frontend/package.json` `version` in a normal pull request. That field is the version players see.
- A player-visible change adds one bullet under `## Unreleased` in `packages/frontend/content/en/misc/changelog.md`. Docs, CI, tests, and refactors do not.
- Cut a release only when asked. `pnpm release` prepares the version bump and moves `Unreleased` into a dated section. Tag `vYYYY.M.MICRO` only after that pull request squash-merges to `main`.
