# Development Issues Log

This document tracks issues encountered during development to assist in future troubleshooting and debugging.

## Format
Each entry includes:
- **Date Discovered**: When the issue was first identified
- **Problem**: Description of symptoms and context
- **Status**: INVESTIGATING or RESOLVED
- **Resolution**: How the issue was fixed (if resolved)

---

## 2025-11-25: Save Migration Not Running for Authenticated Users

**Status**: RESOLVED

**Problem**:
After implementing dual save slot architecture (single-player vs multiplayer), users with existing saves found that old saves with timestamp-based keys (e.g., `hanafuda-save-176413013264`) were not being migrated to the new fixed key format (`hanafuda-save-single`).

**Symptoms**:
- IndexedDB showed old saves with timestamp-based keys
- StartScreen displayed "Play Now" instead of "Resume Game"
- Migration function existed but wasn't executing for authenticated users

**Root Cause**:
The migration function `migrateIndexedDBSaveKeys()` was being called on module initialization when `getCurrentUserId()` might return `'guest_profile'` instead of the actual authenticated user ID. This caused the migration to look for saves under the wrong user ID and find nothing to migrate.

**Context**:
- Migration was using a global flag: `hanafuda-keys-migrated-v2`
- Migration ran on module load via `useStoreManager()` initialization
- Authentication might not be complete at module load time

**Resolution**:
1. Changed migration to use **per-user flags**: `hanafuda-keys-migrated-v2-{uid}` instead of global flag
2. Made migration **lazy**: Now runs when `listSavedGames()` or `quickLoad()` is called, ensuring authentication is complete
3. Added detailed console logging for debugging
4. Migration now correctly processes all old keys and converts them to new format

**Files Changed**:
- `app/composables/useStoreManager.ts:249-313` - Migration function
- `app/composables/useStoreManager.ts:513-548` - `listSavedGames()` now triggers migration
- `app/composables/useStoreManager.ts:625-639` - `quickLoad()` now triggers migration

**Verification**:
Console shows migration messages:
```
Starting save key migration for user {uid}, found {n} saves
Migrating save with old key: 'hanafuda-save-176413013264'
✓ Migrated save key from 'hanafuda-save-176413013264' to 'hanafuda-save-single'
IndexedDB save keys migration complete for {uid}: {n} saves migrated
```

---

## 2025-11-25: Single-Player Saves Not Being Deleted on Resume

**Status**: RESOLVED

**Problem**:
Single-player saves were not being deleted after resuming a game, despite the anti-scumming feature being designed to delete saves on resume. Users would save, resume, play, then return to find the save still present.

**Symptoms**:
- Resume game → Play → Return to start screen → "Resume Game" still appears
- IndexedDB shows the save still exists after resuming
- No deletion occurring in either local IndexedDB or remote Firestore

**Root Cause**:
In `pages/index.vue:336`, the resume logic checked:
```typescript
if (resumeState.value.isResuming && resumeState.value.saveData)
```

However, in `StartScreen.vue:312`, `saveData` was set to `null`:
```typescript
resumeState.value = {
  isResuming: true,
  saveKey: singlePlayerSave.value.key,
  saveData: null, // Data already loaded into stores
  mode: 'single',
}
```

This caused the condition to be **false**, so the entire deletion block was skipped.

**Context**:
- Game state was loaded directly by `loadGameFromStorage()` in StartScreen
- `saveData` was no longer needed in the resume flow
- The old code expected `saveData` to contain serialized game state
- New dual-slot architecture changed the flow but didn't update this condition

**Resolution**:
Changed the condition in `pages/index.vue:336` to only check:
```typescript
if (resumeState.value.isResuming)
```

Removed the `&& resumeState.value.saveData` check since:
1. Game state is already loaded by `loadGameFromStorage()`
2. We only need to handle cleanup (delete the save)
3. Added console logging to verify deletion

**Files Changed**:
- `app/pages/index.vue:336-363` - Resume logic and save deletion

**Verification**:
Console shows deletion messages:
```
Deleting single-player save after resume: hanafuda-save-single
Single-player save deleted successfully
```

After resuming:
- IndexedDB `gameSaves` table has no entries for the user
- StartScreen shows "Play Now" instead of "Resume Game"
- Save does not reappear (confirmed deleted from Firestore too)

---

## 2025-11-28: Multiplayer Join Did Not Load Shared Game State

**Status**: RESOLVED

**Problem**:  
When a second player joined a multiplayer match via invite code, their local game state remained empty or out-of-sync. The join flow updated Firestore documents but did not correctly seed the joining player's local save from the shared `multiplayer_games` state.

**Symptoms**:
- Joiner saw an empty or uninitialized board after the game started.
- IndexedDB `gameSaves` table on the joiner either had no multiplayer entry or contained a state that did not match Firestore.

**Root Cause**:
- `useMultiplayerMatch.joinGame` called `saveMultiplayerGame(p1, p2, activePlayer)` directly after updating Firestore.
- `saveMultiplayerGame` is designed only for the **active player**, and it re-serializes local store state instead of using the remote `gameState`, so the joiner either failed the “active player” check or saved an incorrect state.

**Resolution**:
1. Updated `useMultiplayerMatch` to:
   - Randomly select a starting player (between `p1` and `p2`) and write `activePlayer` on join.
   - Remove the incorrect `saveMultiplayerGame` call from `joinGame`.
   - Call `initializeSync()` + `syncMultiplayerGame(gameId)` to seed the joiner’s local `hanafuda-save-multiplayer` slot from the remote `gameState`.
2. Added a specialized new-multiplayer initialization path in `StartScreen.vue` + `pages/index.vue` so that:
   - The **starting player** runs `startRound()` and then pushes the initialized state via `saveMultiplayerGame`.
   - The **other player** retries `syncMultiplayerGame(gameId)` and then calls `loadMultiplayerGame()` once to hydrate from the starter’s pushed state.

**Files Changed**:
- `app/composables/useMultiplayerMatch.ts` – join flow, starting player selection.
- `app/composables/useStoreManager.ts` – multiplayer sync adapter usage.
- `app/composables/adapters/useMultiplayerSyncAdapter.ts` – push/pull behavior (used by StoreManager).
- `app/components/StartScreen.vue` – multiplayer meta handling and start-game emission.
- `app/pages/index.vue` – `initializeNewMultiplayerGame` (starter vs non-starter init).

**Verification**:
- In two authenticated browser sessions:
  - Host creates a game; joiner joins via invite code.
  - Both sides show the same initialized board (cards dealt, same field/hand layout).
  - IndexedDB `gameSaves` on both clients contains a single multiplayer entry with identical `gameState` payloads (verified via DevTools).

---

## 2025-11-28: Firestore Rules Blocking Multiplayer Saves and Deletes

**Status**: RESOLVED

**Problem**:  
After wiring multiplayer sync, Firestore began returning `FirebaseError: Missing or insufficient permissions` when:
- Deleting game saves via `useGameSavesSyncAdapter.remove`.
- Pushing multiplayer state via `useMultiplayerSyncAdapter.push` / `saveMultiplayerGame`.

**Symptoms**:
- Console errors on initial multiplayer save push from the starting player.
- Console errors when deleting saves, especially for older `game_saves` documents.
- Multiplayer initialization succeeded locally but failed to persist to Firestore.

**Root Cause**:
- `firestore.rules` were stricter than the adapters’ behavior:
  - `game_saves` delete rule required `resource.data.uid == request.auth.uid`, which failed for some legacy docs missing `uid` or with mismatched data despite the doc ID being `${uid}_${saveKey}`.
  - `multiplayer_games` update rule additionally required `request.auth.uid == resource.data.activePlayer` and strict equality on `p1`/`p2`, while the adapter already enforced active-player and participant checks and used `merge` updates.

**Resolution**:
1. `game_saves`:
   - Relaxed delete rule to allow owner deletion when **either**:
     - `resource.data.uid == request.auth.uid`, **or**
     - `saveId.startsWith(request.auth.uid + '_')` (safe fallback for legacy docs).
2. `multiplayer_games`:
   - Simplified update rule for normal game-state updates to:
     - Require `mode == 'multiplayer'` and `isParticipant()`, with active-player enforcement delegated to the adapter.
   - Kept a stricter `isJoiningWaitingGame()` branch for the “second player joins waiting game” transition.

**Files Changed**:
- `firestore.rules` – `match /game_saves/{saveId}` and `match /multiplayer_games/{gameId}` rules.

**Verification**:
- Starting player’s initial `saveMultiplayerGame` push now succeeds (no permission errors).
- Multiplayer game documents in Firestore update correctly on save.
- Deletes from `game_saves` succeed for both new and legacy docs whose IDs start with the user’s auth UID.

---

## 2025-11-28: Remote P2 Cards Appearing as Local P1 Cards

**Status**: RESOLVED

**Problem**:  
In multiplayer matches, each client always treated `p1` as “the player at the bottom” locally. This meant the joiner (canonical `p2`) saw the host’s (`p1`) cards and turn state as if they were their own.

**Symptoms**:
- On the host, the bottom hand correctly showed host’s cards; on the joiner, the bottom hand also showed `p1`’s cards from the shared state.
- Interaction gating (`players.p1.isActive`) only respected canonical `p1`, so turns and hints were wrong for the joiner’s perspective.

**Root Cause**:
- UI and interaction logic hard-coded `p1` as the local player (bottom hand, match hints, draw phase, round results buttons), while the canonical saved state correctly used `p1`/`p2` as host/joiner.

**Resolution**:
1. Introduced `useLocalPlayerPerspective` composable:
   - Tracks `localKey` (`'p1' | 'p2'`), `selfKey`, `opponentKey`, and `isMultiplayerGame` in global state.
2. In `initializeNewMultiplayerGame`:
   - Set `localKey` based on the authenticated user’s UID vs `multiplayerMeta.p1`/`p2`.
   - Marked multiplayer vs single-player mode accordingly.
3. Updated core UI components to use `selfKey` / `opponentKey` instead of hard-coded `p1`/`p2`:
   - `pages/index.vue` – which collection/hand is shown where and when interaction is allowed.
   - `GameLayout.vue` – which status bar is dimmed based on whose turn it is.
   - `HandDisplay.vue` / `FieldDisplay.vue` / `Deck.vue` – hints, discard/draw gating keyed to the local player’s active state.
   - `RoundResults.vue` – only the local active player gets KOI-KOI/STOP controls.

**Files Changed**:
- `app/composables/useLocalPlayerPerspective.ts` – new composable.
- `app/pages/index.vue` – uses `selfKey`/`opponentKey` for collections and hand gating, sets perspective on multiplayer init.
- `app/components/GameLayout.vue` – status bars now tied to `selfKey`/`opponentKey`.
- `app/components/play-area/HandDisplay.vue` – match hints respect local active player.
- `app/components/play-area/FieldDisplay.vue` – discard logic respects local active player.
- `app/components/play-area/Deck.vue` – draw phase check uses local active player.
- `app/components/modal/RoundResults.vue` – KOI-KOI/STOP buttons visible only for local active player.

**Verification**:
- Host view: bottom hand shows host’s cards; top area shows joiner’s cards.
- Joiner view: bottom hand shows joiner’s cards; top area shows host’s cards.
- In both sessions:
  - The same canonical game state (hands, field, deck) is visible, but oriented so that “you” are always at the bottom.
  - Interaction (selecting cards, discarding/drawing, KOI-KOI/STOP) is only enabled when the local player is the active player from the shared state.

---

## Future Issues

(New issues will be added above this line)
