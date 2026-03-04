# CLAUDE.md

## Codebase Purpose

NewHanafuda.art is a client-side web app for playing Koi-Koi, a traditional Japanese hanafuda card game. Players compete against an AI opponent or in real-time multiplayer matches. A secondary goal is showcasing artwork from various hanafuda artists — players earn in-game coins to unlock card designs.

**Tech stack**: Nuxt 4 (SSR disabled, pure SPA), Vue 3, TypeScript, Tailwind CSS v4, Pinia, Supabase, Firebase (Auth/Firestore/RTDB), VueFire.

**Package manager**: pnpm (always use `pnpm`, never `npm` or `yarn`).

## Directory Structure

```
app/                        # Nuxt 4 app directory (primary source code)
  pages/                    # File-based routing (index, rankings, sign-in, etc.)
  components/               # Vue components organized by feature area
    cards/                  #   Card display and animation
    play-area/              #   Game board (hand, field, deck, collections)
    modal/                  #   Dialogs (round results, exit warning, announcements)
    menu/                   #   Settings panels and options
    multiplayer/            #   Multiplayer-specific UI
    ui/                     #   shadcn-vue primitives (via reka-ui)
  composables/              # Business logic composables
    adapters/               #   Sync adapter implementations (Firestore, saves, multiplayer)
  utils/                    # Pure functions, game logic constants, custom directives
  assets/css/               # Tailwind v4 global styles and card CSS
  plugins/                  # Nuxt client plugins
  layouts/                  # Nuxt layouts
  types/                    # App-scoped type declarations
stores/                     # Pinia stores (root-level, outside app/)
  cardStore.ts              #   Deck, hands, field, collections, staging
  gameDataStore.ts          #   Game flow, phases, rounds, scoring, event log
  playerStore.ts            #   Player identity, turns, dealer rotation
  configStore.ts            #   Game settings, rule variations, UI preferences
types/                      # Shared TypeScript type definitions (profile, sync, etc.)
i18n/locales/               # Translation JSON files (en-us, ja-jp, pl-pl, ru-ru, fr-fr)
content/                    # Nuxt Content markdown (localized static pages)
supabase/                   # Migrations, generated types, config
server/                     # Nuxt server routes
lib/                        # Shared libraries (IndexedDB abstractions)
docs/                       # Architecture documentation (markdown)
notes/                      # Planning documents (FEAT_PLANNING_*, FIX_PLANNING_*)
scripts/                    # Build and release tooling
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

## Documentation

### In-Code Documentation
- **JSDoc** all shared utility functions and classes with `@param`, `@returns`, and `@throws`.
- Store and composable files should begin with a `@fileoverview` JSDoc block documenting purpose, key features, and a usage example.
- Inline comments for non-obvious logic only. No comments restating what code already says.

### Architecture Documentation
- High-level feature docs live in `docs/` as markdown files (e.g., `multiplayer-implementation.md`, `game-saves-architecture.md`).
- Planning docs for in-progress work go in `notes/` as `FEAT_PLANNING_<name>.md` or `FIX_PLANNING_<name>.md`.
- Store architecture is documented in `stores/README.md`.
