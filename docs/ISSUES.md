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

## 2025-11-30: Joiner as Starting Player Left Host Board Empty

**Status**: RESOLVED

**Problem**:  
When the invite-code joiner was randomly chosen (or forced) to be the starting player in async multiplayer, only the starter’s client showed the newly dealt board. The non-starting host remained on an empty UI even though Firestore contained a valid multiplayer snapshot.

**Symptoms**:
- With the joiner forced as starter:
  - Joiner saw a fully dealt board and could play normally.
  - Host’s board stayed blank at the start of the round.
- Console logs showed:
  - Multiple `syncMultiplayerGame` attempts on the host with no apparent errors.
  - Local and remote serialized game states sometimes appearing “equal” despite different card layouts.
- Firestore `multiplayer_games` collection contained a valid, dealt `gameState` for the match.

**Root Cause**:
1. **Mismatched game IDs between local state and Firestore**:
   - `useGameDataStore` generated a fresh `gameId` when the starter initialized the round via `startRound()`.
   - `saveMultiplayerGame` serialized this new `gameId` and pushed snapshots to a *different* `multiplayer_games/{gameId}` document than the one used for the original invite-code match.
   - The non-starter (host) continued syncing against the original pre-game document, which never received the dealt state.
2. **Pre-game snapshots overwriting valid boards**:
   - Both clients occasionally pushed snapshots while the board was still uninitialized (full deck, empty hands/field).
   - `syncMultiplayerGame` treated all snapshots as authoritative, so empty “lobby” states could overwrite valid boards on the other client.
   - Early change-detection relied solely on timestamps, which were sometimes equal for structurally different payloads.

**Resolution**:
1. **Canonical multiplayer gameId wiring**:
   - In `initializeNewMultiplayerGame` (`app/pages/index.vue`), the local `gameDataStore.gameId` is now explicitly synchronized to the Firestore multiplayer `gameId` stored in `multiplayerMeta`:
     - If `ds.gameId` differs from `multiplayerMeta.gameId`, we overwrite the local value with the canonical multiplayer ID.
   - Result: both host and joiner always serialize and push to the *same* `multiplayer_games/{gameId}` document, regardless of who starts the round.
2. **Guard against pushing uninitialized boards**:
   - `saveMultiplayerGame` (`app/composables/useStoreManager.ts`) now inspects the current card state before pushing:
     - If `deckSize === DECK.length` and both hand sizes are `0` and `fieldSize === 0`, it treats the board as **uninitialized** (waiting lobby) and:
       - Still saves locally to IndexedDB for resume purposes.
       - Skips updating the shared `multiplayer_games` document.
   - This prevents empty pre-game states from overwriting a valid dealt board in Firestore.
3. **Ignore pre-round remote snapshots during sync**:
   - `syncMultiplayerGame` now parses `remoteState.gameData.eventHistory` and checks for a system `"START ROUND"` event.
   - If no such event exists:
     - It logs a warning indicating the remote state is pre-game and **does not overwrite** the local multiplayer save.
   - If parsing fails, it conservatively applies the snapshot but logs an error.
   - Once the starter has pushed a real round state (with `START ROUND`), subsequent syncs always overwrite local state from Firestore.

**Files Changed**:
- `app/pages/index.vue` – `initializeNewMultiplayerGame` now syncs `ds.gameId` to `multiplayerMeta.gameId`.
- `app/composables/useStoreManager.ts`:
  - `saveMultiplayerGame` adds an “uninitialized board” guard before pushing to Firestore.
  - `syncMultiplayerGame` skips applying snapshots whose `gameData.eventHistory` lacks a `"START ROUND"` system event, treating them as lobby/pre-round states.

**Verification**:
- In two authenticated browser sessions:
  - Host creates a game; joiner joins via invite code.
  - When the joiner is selected as starter:
    - Joiner sees the correctly dealt board and can act as expected.
    - Host now also sees the same dealt board after `syncMultiplayerGame` + `loadMultiplayerGame` run, instead of remaining empty.
  - Firestore shows a single `multiplayer_games/{gameId}` document whose `gameId` matches `ds.gameId` on both clients, and whose `gameState` reflects the dealt board.

---

## 2025-11-30: Multiplayer Hand Showing Card Back After Card Was Collected

**Status**: RESOLVED

**Problem**:  
In async multiplayer games, after a turn hand-off, one client occasionally showed the opponent with an extra face-down card in hand (card back), even though that exact card had already been played to the field and collected into the other player’s collection.

**Symptoms**:
- On the non-active client, the opponent’s hand showed an extra card back (e.g., 3rd slot), while the same card also appeared as the last card in a plains collection row.
- The issue appeared immediately after a turn hand-off, with no refresh/reconnect in between.
- Underlying game state had the same `CardName` present in both `hand.p2` and `collection.p1`.

**Root Cause**:
- In `useCardHandler.handlePlayerDiscard`, the discard operation hard-coded `'p1'` as the player:
  ```ts
  cs.discard(selectedCard.value, 'p1')
  ```
- When the canonical `p2` was the active player:
  - The selected card was in `cs.hand.p2`, but `discard` was invoked with `'p1'`, so it never removed the card from `hand.p2` and only added it to the field.
  - Later, when the other player collected that field card, `collectCards(player)` removed it from the field and the collector’s hand/deck, but **never from `hand.p2`**, leaving the card both in a hand and in a collection.

**Resolution**:
1. **Fix discard ownership**:
   - Updated `handlePlayerDiscard` to respect the current active player instead of hard-coding `'p1'`:
     ```ts
     cs.discard(selectedCard.value, ds.getCurrent.player)
     ds.logPlayerAction(ds.getCurrent.player, 'discard', [selectedCard.value])
     ```
   - This ensures discards always remove the card from the correct hand in both single-player and multiplayer.
2. **Add card-location normalization & diagnostics**:
   - Introduced `normalizeState()` in `cardStore` to enforce the invariant that any card present in a player’s collection is removed from all other zones (`hand`, `field`, `deck`, `staged`) for both players.
   - Wired `normalizeState()` into:
     - `exportSerializedState(...)` (before serializing card data for saves/sync).
     - `importSerializedState(...)` (after loading card data from saves/sync).
   - Added a dev-only helper `_debugLogDuplicateCards(context)` that logs any cards found in multiple zones, aiding future debugging of multiplayer desyncs.

**Files Changed**:
- `app/composables/useCardHandler.ts` – `handlePlayerDiscard` now uses `ds.getCurrent.player` instead of a hard-coded `'p1'`.
- `stores/cardStore.ts` – new `normalizeState()` and `_debugLogDuplicateCards()` helpers, invoked during reset, export, and import.
- `stores/__tests__/cardStore.test.ts` – regression test verifying `normalizeState()` removes a card from all zones except the owning collection.

**Verification**:
- In async multiplayer sessions:
  - Discard actions from either player now correctly remove cards from that player’s hand and place them on the field.
  - After a card is collected into a player’s collection, the same card is no longer present in any hand, field, deck, or staged set (confirmed via DevTools inspection of the `cards` store).
  - No further occurrences of a card back remaining in hand after its card has been collected have been observed during manual multiplayer testing.

---

## 2025-11-30: KOI-KOI Decision Modal Reappearing and Duplicate Yaku Logs in Multiplayer

**Status**: RESOLVED

**Problem**:  
In async multiplayer matches, when a player completed a yaku and called **KOI-KOI**, the round results decision modal would:
- Correctly appear for the scoring player, but
- Reappear for the opponent after the turn hand-off.  
Additionally, the event log showed duplicated yaku completion entries (e.g., “P1 completed KASU” twice) for a single scoring event.

**Symptoms**:
- After a player called KOI-KOI, the opponent’s client saw the KOI-KOI/STOP modal again when the turn switched.
- Event log contained two identical “P1 completed {YAKU}” entries, timestamped within a second of each other.

**Root Cause**:
1. **Decision flow not scoped per client in multiplayer**:
   - `handleCompletion` in `index.vue` called `handleDecision()` (which uses `makeDecision()` from `useDecisionHandler`) on **every** client whenever `CollectionArea` emitted a `completed` event.
   - In multiplayer, both clients ran `handleCompletion()` and set `decision.value = 'pending'`, so `decisionIsPending` became `true` everywhere, causing both clients to open/maintain the decision modal.
2. **Yaku completion generation not scoped per local player**:
   - Each `CollectionArea` instance (for `p1` and `p2`) recomputed yaku and, on detecting new completions, logged `'complete'` events and emitted a `completed` event.
   - When the scoring player’s state synced to the opponent, the opponent’s `CollectionArea` recomputed the same yaku and emitted its own `completed`, producing duplicate log entries.

**Resolution**:
1. **Scope decision flow to the correct local player**:
   - Updated `handleCompletion` in `app/pages/index.vue`:
     - Always saves the result via `ds.saveResult(...)`.
     - In **single-player** (`!isMultiplayerGame.value`), still calls `handleDecision()` unconditionally.
     - In **multiplayer**, only calls `handleDecision()` when `selfKey.value === player` (i.e., the local client represents the canonical player who just completed yaku). Opponent clients do **not** enter a pending decision state.
2. **Limit yaku completion emission to the scoring client in multiplayer**:
   - In `app/components/play-area/CollectionArea.vue`, added local perspective gating:
     ```ts
     const { selfKey, isMultiplayerGame } = useLocalPlayerPerspective()
     ...
     const taggedYaku = applyExtraTags(newCompleted)

     if (isMultiplayerGame.value && player !== selfKey.value) {
       return
     }
     ```
   - This ensures that in multiplayer, only the scoring player’s own client:
     - Logs `'complete'` actions via `ds.logPlayerAction(...)`, and
     - Emits the `completed` event consumed by `index.vue`.
   - The opponent’s client still updates the visual collection, but does not create duplicate log entries or extra `completed` events.

**Files Changed**:
- `app/pages/index.vue` – `handleCompletion` now calls `handleDecision()` only:
  - Always in single-player, and
  - In multiplayer only when `selfKey` equals the scoring `player`.
- `app/components/play-area/CollectionArea.vue` – completion watcher now skips logging/emitting when `isMultiplayerGame` is true and `player !== selfKey`.

**Verification**:
- In single-player:
  - KOI-KOI/STOP modal behavior unchanged; human and CPU decisions behave as before.
- In multiplayer (two authenticated clients):
  - When P1 completes yaku and calls KOI-KOI:
    - Only P1’s client ever enters `decisionIsPending` and sees the decision modal with KOI-KOI/STOP buttons.
    - P2’s client sees updated collections and log entries but **no extra decision modal** after the turn switches.
  - Event log shows a single “P1 completed {YAKU}” entry per actual completion; no duplicate lines appear after remote sync.

---

## 2025-11-30: Multiplayer Round Transition Desync After STOP

**Status**: RESOLVED

**Problem**:  
In async multiplayer, when a player called **STOP** to end a round and then advanced to the next round:
- The inactive (non-calling) player did not see the round results modal, even though the round had ended for them.
- After clicking “Next” on the active player’s side, the new round state was correctly pushed and both players eventually saw the new deal, but:
  - The inactive player initially remained on the previous round view (no results UI).
  - If `p2` was the winner, the **single-player CPU autoplay** (`autoOpponent`) could incorrectly start playing the new round in a multiplayer game.

**Root Cause**:
1. **Round results modal only driven by local decision flow**:
   - The results modal (`showModal`) was primarily controlled by the local `decisionIsPending` / KOI-KOI flow.
   - In multiplayer, only the calling player’s client entered `decisionIsPending`, so only they ever opened the modal in response to a STOP; the opponent’s client had `roundOver = true` but `showModal` remained `false`.
2. **Autoplay trigger not aware of multiplayer mode**:
   - `startRound()` unconditionally set `autoOpponent.value = true` and, if `ps.players.p2.isActive`, called `opponentPlay({ speed: 2 })`.
   - This is correct for single-player (CPU as p2), but in multiplayer it caused the CPU logic to run as soon as `p2` became the starting player of the next round.

**Resolution**:
1. **Ensure both players see round results in multiplayer**:
   - Updated the `watch(roundOver, ...)` block in `app/pages/index.vue`:
     - If `roundOver` becomes `false` and `gameOver` is not set, it closes the modal (`showModal = false`) for new-round starts.
     - When `roundOver` becomes `true`:
       - In single-player, behavior remains unchanged.
       - In multiplayer, if `decisionIsPending` is `false`, it **forces** `showModal.value = true`, ensuring the non-calling player sees the round results modal in read-only mode (no KOI-KOI/STOP buttons).
2. **Disable CPU autoplay in multiplayer**:
   - In `startRound()` in `app/pages/index.vue`, gated the opponent autoplay to single-player only:
     ```ts
     if (!isMultiplayerGame.value && autoOpponent.value && ps.players.p2.isActive) {
       opponentPlay({ speed: 2 })
     }
     ```
   - This keeps CPU behavior intact for single-player while preventing `opponentPlay` from running in any multiplayer context.

**Files Changed**:
- `app/pages/index.vue`:
  - `startRound()` now only triggers `opponentPlay` when `!isMultiplayerGame.value`.
  - `watch(roundOver, ...)` now opens the round results modal for the inactive player in multiplayer when `roundOver` becomes `true` and no decision is pending.

**Verification**:
- In two-client multiplayer tests:
  - When P2 calls STOP and wins the round:
    - P2 sees the round results modal and can click **Next** to start the next round.
    - P1’s client, after syncing, also sees the round results modal with the correct “Player 2 called stop” summary but no decision buttons.
  - On advancing to the next round:
    - Both players see the new deal immediately (from previous fixes).
    - No CPU autoplay occurs; only the human player whose turn it is can act.

---

## 2026-03-01: Multiplayer Stats Tracked From Wrong Player Perspective

**Status**: RESOLVED

**Problem**:
In async multiplayer games, detailed round statistics (koi-koi calls, yaku completions, cards captured, round win/loss) were recorded from the wrong perspective when the local player was assigned `p2`. A `p2` player's wins were counted as losses, opponent's cards were counted as their own captures, and opponent's yaku were attributed to them.

**Symptoms**:
- A player assigned `p2` who won a round would see their loss count increase instead of their win count.
- Cards captured stats reflected the opponent's collection, not the local player's.
- Yaku completion stats attributed the opponent's yaku to the local player.
- Players assigned `p1` were unaffected (stats appeared correct).

**Root Cause**:
`useStatsTracking.ts` hardcoded `'p1'` and `'p2'` literals throughout `processRoundStats` instead of using the perspective-aware `selfKey`/`opponentKey` from `useLocalPlayerPerspective`. Seven references were affected:

| Location | Hardcoded | Should be |
|----------|-----------|-----------|
| Koi-koi call filter | `call.player === 'p1'` | `call.player === selfKey` |
| Opponent koi-koi check | `call.player === 'p2'` | `call.player === opponentKey` |
| Win determination | `winner === 'p1'` | `winner === selfKey` |
| Yaku completion filter | `completion.player === 'p1'` | `completion.player === selfKey` |
| Card collection access | `cs.collection.p1` | `cs.collection[selfKey]` |
| Round result (win) | `winner === 'p1'` | `winner === selfKey` |
| Round result (loss) | `winner === 'p2'` | `winner === opponentKey` |

Note: `PlayerStatusBar.vue`'s `updateGameRecord()` (win/loss/draw/coins) was not affected — it already used `selfKey` correctly. Only the detailed per-round stats in `useStatsTracking` were broken.

**Resolution**:
1. Added `const { selfKey, opponentKey } = useLocalPlayerPerspective()` to `useStatsTracking`.
2. Replaced all 7 hardcoded `'p1'`/`'p2'` references with `selfKey.value`/`opponentKey.value`.
3. Renamed internal variables for clarity: `p1KoikoiCalls` → `selfKoikoiCalls`, `p1Wins` → `selfWins`, `p1YakuCompletions` → `selfYakuCompletions`, `p1Collection` → `selfCollection`.
4. For single-player games, `selfKey` defaults to `'p1'`, so behavior is unchanged.

**Files Changed**:
- `app/composables/useStatsTracking.ts` – replaced hardcoded player keys with perspective-aware keys from `useLocalPlayerPerspective`.

**Verification**:
- In a multiplayer game where the local player was assigned `p2`:
  - Wins correctly increment `roundsPlayed_win` (not `roundsPlayed_loss`).
  - Cards captured stats reflect the local player's own collection.
  - Yaku completions are attributed to the local player's actual yaku.
  - Koi-koi call tracking correctly distinguishes self vs opponent calls.
- Single-player stats remain correct (selfKey resolves to `'p1'`).

---

## 2026-03-01: Leave Message Not Persisting to Opponent

**Status**: RESOLVED

**Problem**:
When a player left a multiplayer game with a farewell message, the message was silently lost before the opponent could see it.

**Root Cause**:
In `usePresence.ts`, `cleanup()` used `set()` which overwrites the entire RTDB entry, erasing the `message` field set by `setMessage()` moments before. The `setMessage()` function also performed an unnecessary read-then-set pattern.

**Resolution**:
1. Changed `cleanup()` to use `update()` instead of `set()` so the `message` field is preserved during the offline transition.
2. Changed `onDisconnect` handler to use `update()` for consistency.
3. Simplified `setMessage()` to use `update()` directly instead of get+set.
4. Also added immediate disconnect modal display when opponent leaves with a message (skip 30s grace period).

**Files Changed**:
- `app/composables/usePresence.ts` – `cleanup()`, `onDisconnect`, `setMessage()` all use `update()`.
- `app/pages/index.vue` – disconnect watcher checks for message to skip grace period.

---

## 2026-03-01: Exit Button Disabled for Player 2 in Multiplayer

**Status**: RESOLVED

**Problem**:
The exit button was always disabled when P2's turn was active, because the inactive check was hardcoded to `p1`.

**Root Cause**:
In `GameLayout.vue`, the computed property `player1Inactive` hardcoded `players.value.p1.isActive`, so when the local player was `p2`, the button was disabled during their own turn.

**Resolution**:
Replaced hardcoded `p1` with perspective-aware key using `selfKey` from `useLocalPlayerPerspective`. Renamed `player1Inactive` to `localPlayerInactive`.

**Files Changed**:
- `app/components/GameLayout.vue` – exit button uses `selfKey` instead of hardcoded `p1`.

---

## 2026-03-01: Disconnect "Claim Victory" Records Win/Loss Stats

**Status**: RESOLVED

**Problem**:
When a player clicked "Claim Victory" after their opponent disconnected, it called `forfeitMultiplayerGame` which recorded the game as `abandoned` with win/loss attribution. This was unfair since disconnects can be accidental.

**Resolution**:
1. Added `'cancelled'` to `GameStatus` type.
2. Added `cancelMultiplayerGame()` to `useStoreManager` — marks game as `cancelled` without setting any winner/loser or forfeit fields. Deletes local multiplayer save.
3. Renamed `handleClaimVictory` to `handleCancelGame` — no stats recorded, returns to StartScreen.
4. Updated `OpponentDisconnectedModal` — button text changed to "End Game", description updated to indicate no results are recorded.

**Files Changed**:
- `types/profile.ts` – added `'cancelled'` to `GameStatus`.
- `app/composables/useStoreManager.ts` – added `cancelMultiplayerGame()`.
- `app/pages/index.vue` – `handleCancelGame` replaces `handleClaimVictory`.
- `app/components/modal/OpponentDisconnectedModal.vue` – renamed button and emit.
- `i18n/locales/en-us.json` – added `cancelDescription` and `endGame` keys.

---

## 2026-03-01: Multiplayer Resume Broken After Page Refresh

**Status**: RESOLVED

**Problem**:
Clicking "Resume Match" on the StartScreen after a page refresh restored stale local state from IndexedDB without re-establishing the Firestore subscription, presence tracking, or syncing the latest game state from the server. The game appeared frozen.

**Root Cause**:
1. `saveMultiplayerGame` only pushed to Firestore without saving metadata to IndexedDB, so the local save had no `p1`/`p2`/`gameId` metadata for rejoin.
2. The resume path in `index.vue` treated multiplayer saves the same as single-player — loaded local state without reconnecting to the live session.
3. No validation of the game's current status in Firestore before showing the Resume button.

**Resolution**:
1. **IDB metadata**: `saveMultiplayerGame` now also writes a `GameSaveRecord` to IndexedDB with `gameId`, `p1`, `p2`, `activePlayer`.
2. **Firestore status check**: `StartScreen.vue` checks the game's Firestore status on mount. If `status !== 'active'`, the stale local save is deleted and a message is shown.
3. **Rejoin orchestration**: Added `rejoinGame()` to `useMultiplayerOrchestrator` which re-establishes Firestore subscription, presence, and opponent tracking.
4. **Resume flow**: `resumeMultiplayerGame` in StartScreen populates `multiplayer-game-meta` state. The `gameStart` watcher in `index.vue` detects multiplayer resume and calls `rejoinGame()`.
5. **Hoisted `handleRemoteUpdate`**: Moved from inside `initializeNewMultiplayerGame` to module scope so both new-game and rejoin paths can share it.

**Files Changed**:
- `app/composables/useStoreManager.ts` – `saveMultiplayerGame` persists to IDB; added `getMultiplayerGame()`.
- `app/composables/useMultiplayerOrchestrator.ts` – added `rejoinGame()`.
- `app/components/StartScreen.vue` – Firestore status check, stale save cleanup, `resumeMultiplayerGame` populates meta.
- `app/pages/index.vue` – multiplayer rejoin path in `gameStart` watcher; hoisted `handleRemoteUpdate`.

---

## Future Issues

(New issues will be added above this line)
