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

## Future Issues

(New issues will be added above this line)
