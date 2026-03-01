# Multiplayer Implementation

Comprehensive documentation of the async multiplayer system for New Hanafuda (Koi-Koi).

---

## Architecture Overview

The multiplayer system is layered across composables, sync adapters, Pinia stores, and Firebase services. Two Firebase products are used in parallel:

- **Firestore** -- game state persistence (turns, hands, scores, event history)
- **Firebase Realtime Database (RTDB)** -- player presence (online/offline/playing)

Both clients share a single Firestore `multiplayer_games/{gameId}` document as the source of truth. Turns are serialized into this document after each handoff. The receiving client deserializes the snapshot to update its local Pinia stores.

### Data Flow

```
                      ┌────────────────────────┐
                      │   Firestore Document    │
                      │  multiplayer_games/{id} │
                      └──────────┬─────────────┘
                         ▲       │
             pushSnapshot│       │ onSnapshot
                         │       ▼
  ┌──────────────┐    ┌────────────────────┐    ┌──────────────┐
  │  Player A    │◄──►│  Multiplayer       │◄──►│  Player B    │
  │  (Browser)   │    │  Orchestrator      │    │  (Browser)   │
  └──────────────┘    └────────────────────┘    └──────────────┘
         │                                            │
         │     ┌─────────────────────────────┐        │
         └────►│  RTDB: presence/{uid}       │◄───────┘
               │  (onDisconnect auto-offline)│
               └─────────────────────────────┘
```

---

## Files Reference

### Core Composables

| File | Role |
|------|------|
| `app/composables/useMultiplayerOrchestrator.ts` | Top-level controller: initialization handshake, snapshot push, subscription management |
| `app/composables/useMultiplayerMatch.ts` | Invite codes, game creation/joining, Firestore document CRUD |
| `app/composables/usePresence.ts` | RTDB presence tracking with `onDisconnect` |
| `app/composables/useStoreManager.ts` | Serialization, deserialization, IndexedDB/Firestore persistence |
| `app/composables/useLocalPlayerPerspective.ts` | Maps current user to `p1` or `p2` slot |
| `app/composables/useOpponentReplay.ts` | Step-by-step visual replay of opponent turns |

### Sync Adapters

| File | Role |
|------|------|
| `app/composables/adapters/useMultiplayerSyncAdapter.ts` | Reads/writes `multiplayer_games/{gameId}` |
| `app/composables/adapters/useGameSavesSyncAdapter.ts` | Single-player save cloud sync via `game_saves/{uid}_{key}` |
| `app/composables/adapters/useFirestoreSyncAdapter.ts` | Profile sync via `users/u_{uid}` |

### Components

| File | Role |
|------|------|
| `app/components/multiplayer/CreateGameFlow.vue` | Host flow: create game, show invite code, wait for opponent |
| `app/components/multiplayer/JoinGameFlow.vue` | Joiner flow: enter code, validate, join |
| `app/components/multiplayer/OpponentStatusBadge.vue` | Colored dot indicator for opponent presence state |
| `app/components/modal/NewMatchModal.vue` | Lobby entry point: create or join |
| `app/components/modal/MultiplayerExitModal.vue` | Leave confirmation with optional message |
| `app/components/modal/OpponentDisconnectedModal.vue` | Shown after 30s grace period when opponent disconnects |
| `app/components/StartScreen.vue` | Home screen with multiplayer section and resume button |

### Types

| File | Key Types |
|------|-----------|
| `types/profile.ts` | `MultiplayerGame`, `GameStatus`, `PresenceState`, `InviteCode`, `GameSaveRecord` |
| `app/composables/useStoreManager.ts` | `SerializedGameState` (exported, imported by `types/profile.ts`) |

---

## Global State Keys

All multiplayer-relevant `useState` keys:

| Key | Type | Purpose |
|-----|------|---------|
| `local-player-key` | `PlayerKey` | `'p1'` or `'p2'` for this client |
| `is-multiplayer-game` | `boolean` | Gates all multiplayer code paths |
| `multiplayer-game-meta` | `{ isNew, gameId, p1, p2, activePlayerUid }` | Initialization handshake data |
| `multiplayer-opponent` | `OpponentPlayer \| null` | Opponent profile (username, avatar) |
| `opponent-presence` | `PresenceState` | Real-time opponent status |
| `terminal-status` | `GameStatus \| null` | `'completed'` / `'abandoned'` / `null` |
| `opponent-replay-active` | `boolean` | True during step-by-step opponent replay |
| `multiplayer-sync-adapter` | `MultiplayerSyncAdapter \| null` | Lazy-initialized adapter |
| `resume-save` | `{ isResuming, saveKey, saveData, mode }` | Resume handshake between StartScreen and index.vue |
| `selected` | `CardName \| null` | Currently selected/highlighted card |

---

## Firestore Collections

| Collection | Doc ID | Shape | Purpose |
|------------|--------|-------|---------|
| `multiplayer_games` | `{gameId}` | `MultiplayerGame` | Shared game state for both players |
| `invite_codes` | `{code}` (e.g. `ABC123`) | `InviteCode` | Invite code lookup and validation |
| `game_saves` | `{uid}_{saveKey}` | `GameSaveRecord` | Single-player save cloud backup |
| `users` | `u_{uid}` | `PlayerProfile` | Player profiles |

### RTDB Paths

| Path | Shape | Purpose |
|------|-------|---------|
| `presence/{uid}` | `{ state, lastSeen, currentGameId, message? }` | Real-time presence |
| `.info/connected` | boolean | Connection state monitoring |

---

## Game State Serialization

The `SerializedGameState` type is the wire format embedded in every `MultiplayerGame.gameState` field:

```typescript
interface SerializedGameState {
  version: string      // '1.0.0'
  timestamp: number    // Date.now()
  gameId: string
  cards: string        // Encrypted + hashed card store state
  gameData: string     // JSON: rounds, turns, phase, eventHistory
  players: string      // JSON: player info, bonus multiplier
  config: string       // JSON: game settings
}
```

### Serialization (`serializeGameState`)

1. Each of the four Pinia stores exports its own serialized state string.
2. A cross-store salt is generated from 8 values: `gameId | roundCounter | turnCounter | turnPhase | activePlayer.id | bonusMultiplier | maxRounds | allowViewingsYaku`.
3. The card store data is AES-GCM encrypted using a PBKDF2-derived key (from `gameId` + config salt), then hashed with FNV-1a for integrity protection.

### Deserialization (`deserializeGameState`)

1. Restore non-card stores first (`gameData`, `players`, `config`) to establish the associated salt.
2. Regenerate the salt from restored store data.
3. Import the card store with the salt for integrity verification and decryption.

The `gameData` string contains the `eventHistory` array -- this is critical for both `syncMultiplayerGame` (guards against pre-game snapshots by checking for `START ROUND` events) and `useOpponentReplay` (diffs to extract new player events for replay).

---

## Invite Code System

### Format

6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes visually ambiguous `0, O, I, 1`). Displayed as `XXX-XXX`. Normalized before lookup (strip dashes/spaces, uppercase).

### Lifecycle

1. **Generate**: Host creates game -> unique code generated (up to 10 collision retries) -> `invite_codes/{code}` written with 24h expiry.
2. **Validate** (`validateInviteCode`): Format check -> Firestore lookup -> expiry check -> used-flag check -> game existence -> game status `'waiting'` -> `p2 === ''`.
3. **Redeem** (`joinGame`): Mark code `used: true`, `usedBy`, `usedAt`. Update game: set `p2`, randomly pick `activePlayer`, set `status: 'active'`.
4. **Cancel** (`cancelGame`): Host deletes the `invite_codes` document and sets game `status: 'abandoned'`.

---

## Player Perspective

`useLocalPlayerPerspective` is the identity composable. When a multiplayer game initializes, `localKey` is set to `'p1'` or `'p2'` based on whether `currentUid === multiplayerMeta.p1`.

- `selfKey` = `localKey` (who am I)
- `opponentKey` = opposite of `localKey`
- `isMultiplayerGame` = global boolean gate

All game stores use abstract `'p1'` / `'p2'` keys internally. The perspective composable maps these to "self" and "opponent" for UI rendering (e.g., `FinalResults` shows "Win" or "Lose" based on `scoreboard[selfKey]`).

---

## Multiplayer Orchestrator

`useMultiplayerOrchestrator` is the top-level controller called from `pages/index.vue`.

### `pushSnapshot(context, activeKeyOverride?, metadata?)`

The primary write path. Calls `saveMultiplayerGame(p1, p2, activeUid, metadata)` which serializes all stores and pushes to Firestore. Called at:

- **Turn change**: When the `activePlayer` watcher detects a handoff
- **Round end**: After `ds.endRound()`
- **New round start**: After `startRound()` in `advanceToNextRound`
- **Instant win**: After a deal-time yaku completion
- **Final close**: When a player closes the final results modal

Guards: only participants may push; `isMultiplayerGame` must be true; skips uninitialized boards (full deck, empty hands).

### `initGame(callbacks, onRemoteUpdate)`

Handles the initialization handshake. Two divergent paths:

**Starter path** (randomly chosen player):
1. `resetAllStores()` + `startRound()` (deals cards, sets up the board)
2. Pushes initial state to Firestore

**Non-starter path**:
1. Polls `syncMultiplayerGame(gameId)` up to 3 times (1s intervals)
2. Waits for the starter's initial snapshot to appear in Firestore

After initialization:
1. `subscribeToGame(gameId, onRemoteUpdate)` for real-time updates
2. `subscribeToOpponentPresence(opponentUid)` for presence tracking

---

## Presence System

Uses RTDB `onDisconnect()` for crash-proof offline detection.

### States

| State | Meaning |
|-------|---------|
| `online` | Connected, not actively playing |
| `playing` | It's this player's turn |
| `offline` | Disconnected (set automatically by RTDB server) |
| `unknown` | Initial/fallback state |

### Flow

1. `initializePresence(gameId)`: Monitor `/.info/connected`. On connect, register `onDisconnect` handler (writes `offline`), then write `online`. A keepalive listener prevents Android 60-second idle disconnects.
2. Turn transitions: `setMyStatus('playing')` when your turn starts, `setMyStatus('online')` when it ends.
3. `subscribeToOpponentPresence(opponentUid)`: Listen to `presence/{opponentUid}`, update global `opponentPresence` ref.
4. `setMessage(message)`: Write an optional goodbye message before leaving.
5. `cleanup()`: Write `offline`, unsubscribe all listeners.

---

## Turn Handoff

The local game loop is identical to single-player. Stores advance the `activePlayer` through their internal phase logic (`select -> draw -> collect -> select`). The multiplayer layer observes these transitions:

```
Player A (active)                    Player B (waiting)
      │                                    │
      ├── Select card from hand            │
      ├── Match or discard                 │
      ├── Draw from deck                   │
      ├── Match or discard                 │
      ├── Collect staged cards             │
      ├── [Optional: yaku -> decision]     │
      │                                    │
      ├── activePlayer changes ─────────► pushSnapshot('turn-change')
      │                                    │
      │                          onSnapshot fires
      │                                    │
      │                          handleRemoteUpdate:
      │                            ├── shouldReplayTurn? ──► replayOpponentTurn()
      │                            └── else ──────────────► syncMultiplayerGame()
      │                                    │
      │                          Player B becomes active
```

### `handleRemoteUpdate` (in `index.vue`)

1. Sets `terminalStatus` from the remote document.
2. If `isReplaying`, buffers the update into `pendingRemoteUpdate` ref and returns early (latest-wins strategy).
3. Checks `shouldReplayTurn(remoteState)`:
   - **Yes**: Calls `replayOpponentTurn()` for animated step-by-step replay (1000ms between events), then reconciles with authoritative state.
   - **No** (round/game over, no new events, already replaying): Calls `syncMultiplayerGame()` for direct state overwrite.
4. After replay/sync, reconciles any buffered `pendingRemoteUpdate` (applies `terminalStatus` and `deserializeGameState` from the buffered state).
5. If `ds.roundOver && !decisionIsPending` after replay, opens the results modal (since the `roundOver` watcher is suppressed during replay).
6. Updates presence status post-replay/sync: sets `'playing'` if it's now the local player's turn, `'online'` otherwise.
7. If `ds.gameOver` after sync, opens the final results modal.

### Guards During Replay

- `canInteractLocalHand`: Returns `false` when `isReplaying.value` is true.
- `activePlayer` watcher: Early-returns during replay to suppress snapshot pushes and presence updates.

---

## Disconnect / Forfeit Handling

### Detection

`isOpponentDisconnected` is computed from `opponentPresence.state === 'offline'`. Watched in `index.vue` with a **30-second grace period**:

1. Opponent goes offline -> start timer
2. If opponent reconnects within 30s -> clear timer, hide modal
3. If 30s expires and still offline -> show `OpponentDisconnectedModal`

### Forfeit Flow

1. Player clicks "Claim Victory" in the disconnect modal.
2. `handleClaimVictory()` calls `forfeitMultiplayerGame(gameId, opponentUid, 'network_disconnect')`.
3. Firestore document updated: `status: 'abandoned'`, `terminalStatus: 'abandoned'`, `forfeitedBy: opponentUid`.
4. Local state forced: `ds.endRound()`, `ds.gameOver = true`, `terminalStatus = 'abandoned'`.
5. Final results modal shown.

### Graceful Exit

Via `MultiplayerExitModal`: player writes optional 200-char message, which is stored in RTDB `presence/{uid}.message`. The opponent sees it in `OpponentDisconnectedModal`.

---

## Round Transition (Multiplayer)

1. Yaku completed -> `handleCompletion` runs. Only `selfKey === player` enters decision flow.
2. Active player chooses koi-koi or stop.
3. **Stop**: `handleStop()` -> `ds.endRound()` -> `pushSnapshot('round-end')`.
4. Non-calling player receives update -> `syncMultiplayerGame` sets `roundOver = true` -> `roundOver` watcher opens their modal (read-only, no buttons).
5. In multiplayer, ALL players see `showAckControls = true` in `RoundResults` (condition: `players[selfKey].isActive || isMultiplayerGame`). The player who clicks "Next" first runs `advanceToNextRound()`:
   - `ds.nextRound()`, `startRound()`, `pushSnapshot('new-round')`.
6. Non-active player receives new round state via snapshot.

---

## Game End

1. Final round ends -> `ds.gameOver = true` -> `terminalStatus = 'completed'` -> `pushSnapshot('round-end')`.
2. Both clients watch `gameOver` and open final results modal.
3. `FinalResults` uses `selfKey`/`opponentKey` to show Win/Lose/Draw.
4. Closing player: `handleClose()` -> `pushSnapshot('final-close')` -> `performFinalCleanup()`:
   - Deletes local multiplayer save (`hanafuda-save-multiplayer`).
   - `resetAllStores()`.
   - Returns to start screen.

---

## Complete Lifecycle Summary

```
Phase 1: Lobby
  Host: createGame() -> invite code generated -> waiting
  Joiner: validateInviteCode() -> joinGame() -> randomly picks starter

Phase 2: Initialization
  Starter: resetAllStores() -> startRound() -> pushSnapshot (initial)
  Non-starter: syncMultiplayerGame() (polls up to 3x)
  Both: subscribeToGame() + subscribeToOpponentPresence()

Phase 3: Gameplay Loop
  Active player takes turn -> activePlayer changes -> pushSnapshot
  Opponent: onSnapshot -> replayOpponentTurn() or syncMultiplayerGame()
  Repeat until round ends

Phase 4: Round Transition
  Yaku completed -> decision (koi-koi/stop) -> pushSnapshot
  Active player advances round -> pushSnapshot('new-round')
  Back to Phase 3

Phase 5: Game End
  Final round -> gameOver = true -> terminalStatus = 'completed'
  Both see FinalResults -> cleanup -> return to StartScreen

Phase 6: Abnormal Termination
  Opponent offline > 30s -> OpponentDisconnectedModal
  Claim victory -> forfeitMultiplayerGame() -> gameOver forced
```
