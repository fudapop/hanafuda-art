# Game Saves Persistence and Syncing Architecture

## Architecture Overview

The system implements a **dual-save-slot architecture** with separate slots for single-player and multiplayer games, using a dual-layer persistence model with offline-first capabilities.

### **1. Save Slot Structure**

**Two Fixed Save Slots:**
- **Single-Player Slot**: `hanafuda-save-single` (private, auto-deletes on resume)
- **Multiplayer Slot**: `hanafuda-save-multiplayer` (shared, persists until completion)

**Guest Restrictions:**
- Guests can only use single-player slot
- Multiplayer requires authenticated account

### **2. Storage Layers**

**Local (IndexedDB via DexBee)**
- Database: `newhanafuda`
- Schema Version: 5
- Table: `gameSaves` with schema at `app/composables/useDexBee.ts:47-66`
- Records: `{id, uid, saveKey, gameState, timestamp, gameId, mode, p1, p2, activePlayer}`
- Indexes on `uid`, `timestamp`, and `mode` for efficient queries

**Remote (Firestore)**

Two collections for different purposes:

1. **Personal Game Saves** (`game_saves`)
   - Collection: `game_saves`
   - Adapter: `app/composables/adapters/useGameSavesSyncAdapter.ts`
   - Operations: `pull()`, `push()`, `remove()`, `isAvailable()`
   - Document IDs: `${uid}_${saveKey}` format
   - Used for single-player saves sync

2. **Shared Multiplayer Games** (`multiplayer_games`)
   - Collection: `multiplayer_games`
   - Adapter: `app/composables/adapters/useMultiplayerSyncAdapter.ts`
   - Operations: `get()`, `list()`, `push()`, `remove()`, `isAvailable()`
   - Document IDs: `${gameId}` (shared between players)
   - Used for multiplayer game state sync

### **3. Orchestration Hub**

**`app/composables/useStoreManager.ts`** - The central coordinator:

```typescript
// Core operations
saveGameToStorage(mode, p1?, p2?, activePlayer?)  // Save with mode awareness
loadGameFromStorage(key)                          // Load specific save
listSavedGames()                                  // List all saves with mode info
deleteSavedGame(key)                              // Remove local + remote

// Single-player
quickSave()                                       // Save to single-player slot
quickLoad()                                       // Load from single-player slot

// Multiplayer-specific
saveMultiplayerGame(p1, p2, activePlayer)         // Save + push to shared Firestore
loadMultiplayerGame()                             // Load multiplayer slot
syncMultiplayerGame(gameId)                       // Pull latest from Firestore
listMultiplayerGames()                            // List user's multiplayer games

// Sync operations
syncPush(uid)                                     // Upload single-player saves
syncPull(uid)                                     // Download and merge saves
initializeSync()                                  // Initialize both adapters

// Utility
getSaveKeyForMode(mode)                           // Get fixed key for mode
```

### **4. Dual Save Slot System**

**Single-Player Slot** (`hanafuda-save-single`):
- Guest-friendly (no auth required)
- Auto-deletes on resume (anti-scumming)
- Syncs to personal `game_saves` collection
- One-time-use per save

**Multiplayer Slot** (`hanafuda-save-multiplayer`):
- Requires authentication (guests blocked)
- Persists until game completion
- Syncs to shared `multiplayer_games` collection
- Both players access same game state

### **5. Mode-Aware Auto-Deletion**

**Single-Player Flow**:
1. User clicks "Resume Game" on `StartScreen.vue:216-250`
2. `loadGameFromStorage()` restores all store state
3. Sets `resumeState.mode = 'single'`
4. Emits `'start-game'` event
5. `pages/index.vue:326-361` watches `gameStart`
6. **Checks mode - if 'single', calls `deleteSavedGame()`**
7. Save is deleted (anti-scumming)

**Multiplayer Flow**:
1. User clicks "Resume Match" on `StartScreen.vue:252-286`
2. `loadGameFromStorage()` restores all store state
3. Sets `resumeState.mode = 'multiplayer'`
4. Emits `'start-game'` event
5. `pages/index.vue` checks mode - if 'multiplayer', **skips deletion**
6. Save persists until game completion

### **6. Save/Resume Lifecycle**

**Single-Player:**
```
┌──────────────────────────────────────────────────────────┐
│  Player in game → Clicks Exit                            │
│    ↓ (GameLayout.vue)                                    │
│  ExitWarning modal shows 3 options:                      │
│    • "Save & Exit" → quickSave() → Back to home          │
│    • "Forfeit & Exit" → No save → Back to home           │
│    • "Keep Playing" → Cancel                             │
└──────────────────────────────────────────────────────────┘
                         ↓ (if saved)
┌──────────────────────────────────────────────────────────┐
│  StartScreen shows "Single Player" section               │
│    → "Resume Game" button (green)                        │
│    → Last save timestamp + Delete button                 │
└──────────────────────────────────────────────────────────┘
                         ↓ (user clicks resume)
┌──────────────────────────────────────────────────────────┐
│  resumeSinglePlayerGame()                                │
│    → loadGameFromStorage('hanafuda-save-single')         │
│    → Set resumeState.mode = 'single'                     │
│    → Game starts → deleteSavedGame() called              │
│    → Save is DELETED (anti-scumming)                     │
└──────────────────────────────────────────────────────────┘
```

**Multiplayer:**
```
┌──────────────────────────────────────────────────────────┐
│  Player makes move → Becomes inactive                    │
│    ↓ (Active player changes)                             │
│  saveMultiplayerGame(p1, p2, newActivePlayer)            │
│    → Save to local IndexedDB                             │
│    → Validate: caller is active player                   │
│    → Push to shared multiplayer_games/${gameId}          │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Other player opens game                                 │
│    → syncMultiplayerGame(gameId)                         │
│    → Pull latest from Firestore                          │
│    → Update local cache if remote is newer               │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  StartScreen shows "Multiplayer" section (auth only)     │
│    → "Resume Match" button (blue)                        │
│    → Last save timestamp + Delete button                 │
└──────────────────────────────────────────────────────────┘
                         ↓ (user clicks resume)
┌──────────────────────────────────────────────────────────┐
│  resumeMultiplayerGame()                                 │
│    → loadGameFromStorage('hanafuda-save-multiplayer')    │
│    → Set resumeState.mode = 'multiplayer'                │
│    → Game starts → Save PERSISTS (no auto-delete)        │
└──────────────────────────────────────────────────────────┘
```

### **7. Data Serialization & Security**

**Card Store** (`stores/cardStore.ts:144-254`):
- **Encrypted** with AES-GCM (gameId as IV)
- **Integrity verified** with FNV1a-mixed hash
- **Associated data salt** from other stores prevents tampering
- Prevents deck manipulation/cheating

**Other Stores** (gameData, player, config):
- JSON serialized without encryption
- Version checking for compatibility

**SerializedGameState Structure**:
```typescript
{
  version: '1.0.0',           // For compatibility checking
  timestamp: number,          // Milliseconds (Date.now())
  gameId: string,             // Unique game identifier
  cards: string,              // Encrypted + hashed (FNV1a-mixed)
  gameData: string,           // JSON serialized game mechanics
  players: string,            // JSON serialized player state
  config: string              // JSON serialized game settings
}
```

### **8. Sync Strategy**

**Auto-sync** (debounced 1 second after save):
```typescript
triggerAutoSync(uid)
  → Wait 1 second
  → If idle: syncPush(uid)
  → Firestore.setDoc(merge: true)
```

**Conflict resolution**:
- Latest timestamp wins
- Merge happens during `syncPull()`
- No data loss from conflicts

**Merge Semantics** (syncPull):
```
For each remote save:
  ├─ Find matching local save by saveKey
  ├─ If not found: Add remote save to local
  ├─ If found: Compare timestamps
  │  ├─ If remote newer: Replace local with remote
  │  └─ If local newer: Keep local (already stored)
  └─ Increment mergedCount

Result: Latest timestamp always wins
        No data loss from conflicts
```

### **9. Guest-to-Account Transfer**

**`app/composables/useProfile.ts:30-104`**:
```typescript
transferGuestToAuthProfile(user)
  1. Pull existing remote profile (if any)
  2. Merge guest data with remote
  3. syncPush(uid, transferFromGuest=true)
     → Gets all guest saves
     → Updates uid to authenticated user
     → Pushes to Firestore
     → Removes from guest account
```

**Key Safety Measures**:
- Pull is required before transferring (prevents overwriting existing remote data)
- If pull fails: Abort transfer and load profile normally
- Non-critical sync failures don't block the transfer
- Logs all decisions for debugging

### **10. Error Handling**

**Integrity Errors**:
- Hash mismatch → "Save data may have been tampered with"
- Missing fields → "Invalid save format - missing required fields"
- Decryption failure → Logged as load error

**Sync Errors**:
- Network unavailable → Status set to 'idle', continues offline
- Firestore push failure → Logged, retries on next save
- Pull conflicts → Latest timestamp wins (deterministic merge)
- Transfer failures → Logged as warnings, non-critical

**Fallback Recovery**:
- IndexedDB failure → Uses memory store
- Firestore timeout → Accepts local-only state
- Corrupted save → Shows error, user must start new game

### **11. Type Definitions**

**File**: `types/profile.ts:130-147`

```typescript
interface GameSaveRecord {
  id: string                    // ${uid}_${saveKey}
  uid: string                   // User ID or 'guest_profile'
  saveKey: string               // 'hanafuda-current-save' or 'hanafuda-save-{timestamp}'
  gameState: any                // SerializedGameState
  timestamp: Date               // When saved
  gameId: string                // Unique game ID
}

interface LocalGameSaveStore {
  init(): Promise<void>
  get(uid, saveKey): Promise<GameSaveRecord | null>
  list(uid): Promise<GameSaveRecord[]>
  set(save): Promise<void>
  remove(uid, saveKey): Promise<void>
  clear(uid): Promise<void>
}

type SyncStatus = 'idle' | 'pulling' | 'pushing' | 'syncing' | 'error'
```

## Key Files Reference

### Core Infrastructure
- `app/composables/useDexBee.ts` - IndexedDB schema definition
- `app/composables/useStoreManager.ts` - Central orchestration (715 lines)
- `app/composables/adapters/useGameSavesSyncAdapter.ts` - Firestore sync adapter
- `app/composables/useProfile.ts` - Authentication and sync initialization
- `types/profile.ts` - Type definitions

### Game State Stores
- `stores/cardStore.ts:144-254` - Encryption/hash implementation
- `stores/gameDataStore.ts:271-307` - Game mechanics serialization
- `stores/playerStore.ts:161-186` - Player state serialization
- `stores/configStore.ts:182-219` - Configuration serialization

### UI Components
- `app/components/StartScreen.vue:180-229` - Resume/Play buttons
- `app/components/GameLayout.vue:225-243` - Exit handling
- `app/components/modal/ExitWarning.vue` - Exit dialog
- `app/components/menu/GameStatePanel.vue` - Debug panel

### Game Page
- `app/pages/index.vue:326-350` - Resume logic and save deletion

## Complete Data Flow

### Save Flow
```
User clicks "Save & Exit"
  ↓ (GameLayout.vue:225-243)
handleSaveAndExit()
  ↓
quickSave()
  ├─ serializeGameState()
  │  ├─ CardStore.exportSerializedState(salt, gameId)
  │  │  ├─ Collect hands, collections, field, deck, staged
  │  │  ├─ JSON.stringify()
  │  │  ├─ Encrypt with AES-GCM
  │  │  ├─ Hash with FNV1a-mixed + salt
  │  │  └─ Return {encryptedData, hash, version}
  │  ├─ GameDataStore.exportSerializedState()
  │  ├─ PlayerStore.exportSerializedState()
  │  └─ ConfigStore.exportSerializedState()
  └─ saveGameToStorage()
     ├─ For guests: Delete all existing saves
     ├─ Create GameSaveRecord {id, uid, saveKey, gameState, timestamp, gameId}
     ├─ IndexedDB.gameSaves.insert()
     └─ triggerAutoSync() [1 second debounce]
        └─ syncPush(uid)
           └─ Firestore.game_saves.setDoc(id, data, {merge: true})
```

### Load Flow
```
User clicks "Resume Game" (StartScreen.vue:197-229)
  ↓
resumeGame()
  ├─ loadGameFromStorage(lastSave.key)
  │  ├─ IndexedDB.gameSaves.get(id)
  │  └─ deserializeGameState(gameState)
  │     ├─ Validate version
  │     ├─ GameDataStore.importSerializedState()
  │     ├─ PlayerStore.importSerializedState()
  │     ├─ ConfigStore.importSerializedState()
  │     ├─ Generate associated salt
  │     └─ CardStore.importSerializedState(data, salt, gameId)
  │        ├─ Verify FNV1a-mixed hash
  │        ├─ Decrypt AES-GCM
  │        ├─ JSON.parse()
  │        └─ Restore hands, collections, field, deck, staged
  └─ emit('start-game')
     (pages/index.vue watches gameStart)
     ├─ Game mounts with restored state
     └─ deleteSavedGame() [save cleared]
```

## Security Features

### Encryption
- **Algorithm**: AES-GCM (card data only)
- **IV**: gameId (unique per game session)
- **Key**: Derived from uid + gameId
- **Legacy Support**: Reads plain text saves for backward compatibility

### Integrity Verification
- **Hash Algorithm**: FNV1a-mixed (hash function for card saves)
- **Associated Data Salt**: Components from other stores
  ```
  salt = gameId | roundCounter | turnCounter | turnPhase
         | activePlayer | bonusMultiplier | maxRounds | allowViewingsYaku
  ```
- **Verification**: Hash recalculated during load, compared to stored hash
- **Tampering Detection**: Throws error if hashes don't match

### Anti-Scumming (Save Manipulation Prevention)
- Save only via "Save & Exit" dialog
- Save automatically deleted when resumed
- Single slot prevents save reloading
- No mid-game save/load available
- Encrypted deck state prevents card manipulation

## UI Components

### StartScreen (`app/components/StartScreen.vue`)

**Updated to support dual save slots:**

```
┌─────────────────────────────────┐
│  Single Player                  │
│  ┌──────────────────────────┐   │
│  │ Resume Game              │   │  ← Green (if save exists)
│  │ Last saved: 2 hours ago  │   │
│  │ [Delete]                 │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ Play Now                 │   │  ← Amber (if no save)
│  └──────────────────────────┘   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Multiplayer                    │  ← Hidden for guests
│  ┌──────────────────────────┐   │
│  │ Resume Match             │   │  ← Blue (if save exists)
│  │ Last saved: 1 hour ago   │   │
│  │ [Delete]                 │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ New Match (Coming Soon)  │   │  ← Purple, disabled
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**Key changes:**
- Separate saves by mode using `singlePlayerSave` and `multiplayerSave` computed
- Mode-specific resume handlers: `resumeSinglePlayerGame()`, `resumeMultiplayerGame()`
- Mode-specific delete handlers
- Multiplayer section hidden for guests (`v-if="!isGuest"`)
- Color-coded buttons by mode (green/amber for SP, blue/purple for MP)

## Firestore Security Rules

**File**: `firestore.rules`

**Personal Game Saves** (`game_saves`):
```javascript
match /game_saves/{saveId} {
  // Only owner can read/write their saves
  allow read: if request.auth != null && resource.data.uid == request.auth.uid;
  allow create, update: if request.auth != null && request.resource.data.uid == request.auth.uid;
  allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
}
```

**Shared Multiplayer Games** (`multiplayer_games`):
```javascript
match /multiplayer_games/{gameId} {
  function isParticipant() {
    return request.auth.uid == resource.data.p1 || request.auth.uid == resource.data.p2;
  }

  function isRequestParticipant() {
    return request.auth.uid == request.resource.data.p1
        || request.auth.uid == request.resource.data.p2;
  }

  // Participants can read their games
  allow read: if request.auth != null && isParticipant();

  // Any authenticated user can create (for matchmaking)
  allow create: if request.auth != null && isRequestParticipant();

  // Only active player can update
  allow update: if request.auth != null && isParticipant()
                && request.auth.uid == resource.data.activePlayer;

  // Participants can delete
  allow delete: if request.auth != null && isParticipant();
}
```

## Migration Strategy

**Automatic migrations handle backward compatibility:**

### localStorage → IndexedDB Migration
- Runs once per user (flag: `hanafuda-saves-migrated`)
- Migrates old localStorage saves to IndexedDB
- Converts old keys (`hanafuda-current-save`, `hanafuda-save-{timestamp}`) to new format (`hanafuda-save-single`)
- Sets `mode: 'single'` for all legacy saves

### IndexedDB Key Format Migration
- Runs once per user (flag: `hanafuda-keys-migrated-v2`)
- Renames saves with old key formats to new fixed keys
- `hanafuda-current-save` → `hanafuda-save-single`
- `hanafuda-save-{timestamp}` → `hanafuda-save-single` (keeps most recent)
- Preserves all game state data

**Migration code**: `app/composables/useStoreManager.ts:191-300`

## Implementation Status

✅ **Completed Features:**
- **Dual save slot architecture** (single-player + multiplayer)
- **Fixed save keys** based on game mode
- **Mode-aware auto-deletion** (single-player only)
- **Guest restrictions** (multiplayer blocked)
- **Active player validation** (multiplayer push restrictions)
- **Shared multiplayer game state** via Firestore
- **Separate UI sections** for each mode
- **Multiplayer sync adapter** with participant validation
- **Automatic migrations** for backward compatibility
- Local IndexedDB persistence with DexBee (schema v5)
- Remote Firestore sync with conflict resolution
- Encryption & integrity verification for card state
- Guest-to-account transfer
- Debounced auto-sync for single-player
- Offline-first architecture with graceful degradation
- **Firestore security rules** for both collections

🚧 **Pending Features:**
- Multiplayer matchmaking system
- Real-time sync via WebSockets (optional enhancement)
- Multiplayer game completion/cleanup logic
- Turn notification system

## Usage Examples

### Saving a Single-Player Game
```typescript
// From GameLayout component - Save & Exit
const handleSaveAndExit = async () => {
  const storeManager = useStoreManager()
  await storeManager.quickSave() // Defaults to 'single' mode
  // Saves to 'hanafuda-save-single'
  // Auto-syncs to personal game_saves collection after 1 second
  gameStart.value = false // Return to home screen
}
```

### Saving a Multiplayer Game
```typescript
// After player makes a move
const handleMultiplayerMove = async () => {
  const storeManager = useStoreManager()
  const currentUid = getCurrentUserId()

  // Make the move logic here...

  // Save and sync (only if current player is active)
  const newActivePlayer = otherPlayer.uid
  await storeManager.saveMultiplayerGame(
    player1.uid,
    player2.uid,
    newActivePlayer
  )
  // Saves to 'hanafuda-save-multiplayer' locally
  // Pushes to shared multiplayer_games/${gameId} in Firestore
}
```

### Loading a Single-Player Save
```typescript
// From StartScreen component
const resumeSinglePlayerGame = async () => {
  const storeManager = useStoreManager()

  await storeManager.loadGameFromStorage('hanafuda-save-single')
  // All stores are restored

  const resumeState = useState('resume-save')
  resumeState.value = {
    isResuming: true,
    saveKey: 'hanafuda-save-single',
    mode: 'single',
  }

  emit('start-game')
  // Game page will auto-delete the save (anti-scumming)
}
```

### Loading a Multiplayer Save
```typescript
// From StartScreen component
const resumeMultiplayerGame = async () => {
  const storeManager = useStoreManager()

  // First sync latest from Firestore
  await storeManager.syncMultiplayerGame(gameId)

  // Then load from local cache
  await storeManager.loadGameFromStorage('hanafuda-save-multiplayer')

  const resumeState = useState('resume-save')
  resumeState.value = {
    isResuming: true,
    saveKey: 'hanafuda-save-multiplayer',
    mode: 'multiplayer',
  }

  emit('start-game')
  // Game page will NOT delete the save (persists)
}
```

### Syncing Multiplayer Game
```typescript
// Pull latest state from shared Firestore doc
const storeManager = useStoreManager()
const wasUpdated = await storeManager.syncMultiplayerGame(gameId)
if (wasUpdated) {
  console.log('Local cache updated with latest game state')
  // Reload the game state
  await storeManager.loadMultiplayerGame()
}
```

### Listing Saves by Mode
```typescript
const storeManager = useStoreManager()
const saves = await storeManager.listSavedGames()

// Filter by mode
const singlePlayerSaves = saves.filter(s => s.mode === 'single')
const multiplayerSaves = saves.filter(s => s.mode === 'multiplayer')

// Or use computed (as in StartScreen)
const singlePlayerSave = computed(() =>
  savedGames.value.find(s => s.mode === 'single') || null
)
```

## Future Considerations

Potential enhancements:
- **Multiplayer matchmaking** - System to pair players for new games
- **Real-time sync** - WebSocket connection when both players online
- **Turn notifications** - Push notifications when it's your turn
- **Game chat** - In-game messaging between players
- **Spectator mode** - Watch ongoing multiplayer games
- **Game history/replay** - Review past games
- **Cloud save versioning** - Restore from previous versions
- **Conflict resolution UI** - Manual merge for complex conflicts
- **Background sync** - Service Workers for offline sync
