# CLAUDE.md

## Codebase Purpose

NewHanafuda.art is a client-side web app for playing Koi-Koi, a traditional Japanese hanafuda card game. Players compete against an AI opponent or in real-time multiplayer matches. A secondary goal is showcasing artwork from various hanafuda artists — players earn in-game coins to unlock card designs.

**Tech stack**: Nuxt 4 (SSR disabled, pure SPA), Vue 3, TypeScript, Tailwind CSS v4, Pinia, Firebase (Auth/Firestore/RTDB), VueFire.

**Package manager**: pnpm (always use `pnpm`, never `npm` or `yarn`).

## Directory Structure

This is a pnpm monorepo with four packages:

```
packages/
  frontend/                   # Nuxt 4 SPA → Cloudflare Pages
    app/                      # Nuxt 4 app directory (primary source code)
      pages/                  # File-based routing (index, rankings, sign-in, etc.)
      components/             # Vue components organized by feature area
      composables/            # Business logic composables
      utils/                  # Pure functions, game logic constants, custom directives
      assets/css/             # Tailwind v4 global styles and card CSS
      plugins/                # Nuxt client plugins
      layouts/                # Nuxt layouts
      types/                  # App-scoped type declarations
    stores/                   # Pinia stores
    types/                    # Shared TypeScript type definitions
    i18n/locales/             # Translation JSON files
    content/                  # Nuxt Content markdown (localized static pages)
    lib/                      # Shared libraries (IndexedDB abstractions)
    server/                   # Nuxt server routes
  backend/                    # Hono server → Railway
    src/                      # API routes, serves landing page
  shared/                     # @hanafuda/shared types & constants
    src/                      # Shared exports
  landing/                    # Static marketing page for fudapop.com
docs/                         # Architecture documentation (markdown)
scripts/                      # Build and release tooling
```

## Code Conventions

### Vue Components
- Always `<script setup lang="ts">` (Composition API). No Options API.
- Props via `defineProps<{...}>()` with inline type generics.
- Emits via `defineEmits<{...}>()` with typed event signatures.
- PascalCase filenames (`CollectionArea.vue`, `RoundResults.vue`).

### TypeScript
- Prefer `type` over `interface` for data shapes. Use `as const` for literal tuples.
- Derive types from constants where possible: `type CardName = (typeof DECK)[number]`.
- Import aliases: `~/` for `app/` relative, `~~/` for project root (stores, types).

### Pinia Stores
- Options syntax in `cardStore`, `gameDataStore`, `configStore`; setup syntax in `playerStore`.
- Abbreviated local names: `cs = useCardStore()`, `ps = usePlayerStore()`, `ds = useGameDataStore()`, `config = useConfigStore()`.
- Always use `storeToRefs()` when destructuring reactive state.

### Naming
- **Components**: PascalCase (`.vue`)
- **Composables**: camelCase with `use` prefix (`useCardHandler.ts`)
- **Utilities**: camelCase functions (`matchByMonth`, `getRandomString`)
- **Types**: PascalCase (`PlayerKey`, `CardName`)
- **Constants**: SCREAMING_SNAKE_CASE (`DECK`, `YAKU`, `OPTIONS`)
- **Tests**: `<name>.test.ts` or `<name>.nuxt.test.ts` (co-located in `__tests__/` dirs)

### Styling
- Tailwind CSS v4 with custom theme tokens in `global.css` (`--color-primary`, `--color-hanafuda-red`, etc.).
- Custom utilities via `@utility` (`.card`, `.pri-btn`, `.sec-btn`, `.game-ui-btn`).
- Dark mode via `.dark` class. Mobile-first with custom `xs: 420px` breakpoint.
- UI primitives from shadcn-vue (prefixed with `ui`).

### Composable Patterns
- Named arrow function exports: `export const useCardHandler = () => { ... }`.
- `useState` for cross-component shared state within a session.
- Composables call other composables directly (no DI needed).

## Issue Tracking

Issues are tracked in **Linear** via MCP. Use the Linear MCP tools (`mcp__linear__*`) to:
- View and search issues: `list_issues`, `get_issue`
- Create or update issues: `save_issue`
- Comment on issues: `create_comment`, `list_comments`
- Browse projects and teams: `list_projects`, `list_teams`

When filing bugs or feature requests, include relevant file paths and reproduction steps.

## Releases

Players see one version: `packages/frontend/package.json` `"version"`, injected as `runtimeConfig.public.version` and linked from the start-screen footer to `/changelog`. `backend`, `shared`, and `landing` stay at `0.1.0`. Do not bump those.

Version format is calendar versioning, `YYYY.M.MICRO`, month not zero-padded. The first release in a UTC month is `.0`. Another release in that same month increments `MICRO`. Tags are lightweight and use a `v` prefix (`v2026.4.0`). There are no GitHub Releases.

The English changelog is `packages/frontend/content/en/misc/changelog.md` (root `CHANGELOG.md` is a symlink to it). `/changelog` renders the locale file through Nuxt Content. `ja`, `fr`, `pl`, and `ru` copies are translations of that English file. Heading style is `## [2026.4.0] - 2026-04-05`, then `### Bug Fixes` / `### New Features` / `### UI & Experience Improvements` / `### Performance & Technical Improvements`, then bullets: `- **Short title**: One player-facing sentence.`

Pull requests are stacked and squash-merged, so a version bump in every PR conflicts and a tag on the PR branch points at a commit squash-merge throws away. `pnpm release` only prepares files. It does not commit, tag, or push.

### Normal pull request

- Player-visible change (gameplay, UI, auth, privacy, installed-app behavior): add a bullet under `## Recent changes` at the top of the English changelog. Create that heading when it is missing. Leave the version number alone. Leave the other locales alone.
- No player-visible change (docs, CI, tests, refactors, internal tooling): do not touch the changelog or the version.

### Scheduled release

`.github/workflows/release.yml` cuts a release every Sunday at 00:00 UTC. Run the **Release** workflow with `workflow_dispatch` to cut one sooner. The workflow and a second run share a concurrency group so two cuts do not run at once.

1. If `## Recent changes` in the English changelog has no bullets, the run succeeds and does nothing.
2. Otherwise it checks out `main` and runs `pnpm release`. That bumps `packages/frontend/package.json` to the next `YYYY.M.MICRO` and moves the notes under `## Recent changes` to `## [YYYY.M.MICRO] - YYYY-MM-DD`, leaving an empty `## Recent changes` heading for the next notes. The command fails when that heading is missing, duplicated, empty, or only category headings with no bullets.
3. It commits those two files on `release/vYYYY.M.MICRO` and opens a pull request titled `chore(release): vYYYY.M.MICRO`. The pull request is authenticated as the fuda-bot GitHub App (`APP_CLIENT_ID` variable and `APP_PRIVATE_KEY` secret, the same app Translate content uses) so CI starts. Auto-merge is enabled with squash only for that same-repository pull request, and only when its head is the release commit. An open pull request for this version is updated when `main` has new notes, and left as-is when it already matches. An open pull request for an older `release/v*` version from this repository is closed.
4. After that squash merge reaches `main`, the tag job in the same workflow creates lightweight tag `vYYYY.M.MICRO` on that commit when `packages/frontend/package.json` `version` changed and the tag does not already exist. Do not tag the pull request branch, and do not tag by hand.

Localized changelogs are not part of `pnpm release`. Leave `ja` / `fr` / `pl` / `ru` unchanged in the release pull request. After it merges to `main`, `.github/workflows/translate-content.yml` runs `scripts/i18n-translate.ts` on Vertex AI and opens a separate translation pull request. It translates changed release sections while preserving unchanged historical translations. The heading `## Recent changes` stays in English in every locale.

For a manual catch-up, run **Translate content** on `main` with `mode=changed` and `base_ref` set to a commit or tag before the English changes. Enable `dry_run` first to review the plan without API calls or file writes. An open translation PR may extend the range back to its merge-base, but never narrows the requested range; its locale edits are merged into the plan. Choose `mode=full` only when a complete retranslation is intended.

Do not invent translations by hand or block a release when translation credentials are unavailable. The release pull request says localized changelogs follow separately.

`pnpm release` still works locally (preview with `pnpm release:dry-run`). Optional `--date YYYY-MM-DD` pins the UTC calendar day. A local run prepares the same two files and does not commit, tag, or push. The Sunday workflow is the usual way to open the pull request. A release commit that reaches `main` is tagged by the workflow.

## Documentation

### In-Code Documentation
- **JSDoc** all shared utility functions and classes with `@param`, `@returns`, and `@throws`.
- Store and composable files should begin with a `@fileoverview` JSDoc block documenting purpose, key features, and a usage example.
- Inline comments for non-obvious logic only. No comments restating what code already says.

### Architecture Documentation
- High-level feature docs live in `docs/` as markdown files (e.g., `multiplayer-implementation.md`, `game-saves-architecture.md`).
- Planning docs for in-progress work go in `notes/` as `FEAT_PLANNING_<name>.md` or `FIX_PLANNING_<name>.md`.
- Store architecture is documented in `stores/README.md`.
