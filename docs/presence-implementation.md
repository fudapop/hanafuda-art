# Presence Implementation

## Overview

This document describes the real-time presence tracking system implemented for multiplayer games. The system uses Firebase Realtime Database (RTDB) to track player online status, detect disconnections, and show when players are actively taking their turn.

## Architecture

### Technology Stack

- **Firebase Realtime Database (RTDB)**: Used for presence tracking instead of Firestore
  - Provides built-in `onDisconnect()` handlers for reliable disconnect detection
  - Automatic cleanup on client crashes and network failures
  - Lower latency for real-time updates compared to Firestore

- **Firebase Firestore**: Continues to be used for game state synchronization
  - Presence and game state are intentionally separated for better performance

### Data Structure

Presence data is stored in RTDB at the path: `/presence/{uid}`

```typescript
type PresenceState = {
  uid: string
  state: 'online' | 'offline' | 'playing' | 'unknown'
  lastSeen: Date | null
  currentGameId: string | null
}
```

## Components

### 1. `usePresence` Composable

**Location**: `app/composables/usePresence.ts`

The core composable that manages all presence tracking functionality.

#### Key Features

- **Connection Monitoring**: Monitors RTDB connection status via `.info/connected`
- **Automatic Disconnect Handling**: Uses `onDisconnect()` to mark users offline on crashes/network failures
- **Keepalive Mechanism**: Prevents Android devices from disconnecting after 60 seconds
- **Opponent Subscription**: Real-time subscription to opponent's presence updates
- **Status Updates**: Supports `'online'` and `'playing'` states

#### API

```typescript
type PresenceComposable = {
  // Initialize presence for current user in a game
  initializePresence: (gameId: string) => Promise<void>
  
  // Subscribe to opponent's presence updates
  subscribeToOpponentPresence: (opponentUid: string) => Unsubscribe | null
  
  // Update current user's status
  setMyStatus: (status: 'online' | 'playing') => Promise<void>
  
  // Cleanup presence tracking
  cleanup: () => Promise<void>
  
  // Reactive state
  opponentPresence: Readonly<Ref<PresenceState>>
  isOpponentOnline: Readonly<Ref<boolean>>
  isOpponentPlaying: Readonly<Ref<boolean>>
  
  // Utility
  formatLastSeen: (lastSeen: Date) => string
}
```

#### Implementation Details

**Connection Flow**:
1. Monitor `.info/connected` for connection status
2. When connected, register `onDisconnect()` handler FIRST (critical for reliability)
3. Then mark user as online
4. Keep connection alive with a persistent listener

**Disconnect Detection**:
- `onDisconnect()` is registered before going online to ensure it's active
- Automatically triggers on:
  - Network disconnection
  - Client crashes
  - Browser tab close
  - App backgrounding (mobile)

**Status States**:
- `'online'`: User is connected and in the game
- `'playing'`: User is actively taking their turn
- `'offline'`: User has disconnected
- `'unknown'`: No presence data available yet

### 2. `OpponentStatusBadge` Component

**Location**: `app/components/multiplayer/OpponentStatusBadge.vue`

A reusable component that displays the opponent's presence status with visual indicators.

#### Features

- **Visual Status Indicator**: Colored dot with animation
  - Green pulsing dot: Online
  - Blue pulsing dot: Playing (taking turn)
  - Gray dot: Offline
- **Status Text**: Human-readable status messages
- **Last Seen**: Shows "X minutes ago" when offline
- **Responsive**: Can hide text on mobile landscape

#### Props

```typescript
type Props = {
  presence: PresenceState
  showText?: boolean  // Default: true
}
```

### 3. Integration Points

#### Game Creation (`useMultiplayerMatch.ts`)

Presence is initialized when:
- A new game is created (`createGame()`)
- A player joins a game (`joinGame()`)
- Presence is cleaned up when a game is cancelled (`cancelGame()`)

```typescript
// In createGame()
await initializePresence(gameId)

// In joinGame()
await initializePresence(gameId)

// In cancelGame()
await cleanupPresence()
```

#### Game Initialization (`pages/index.vue`)

When a multiplayer game starts:
1. Presence is initialized (already done in `createGame`/`joinGame`)
2. Subscribe to opponent's presence after game metadata is loaded
3. Update presence status based on turn changes

```typescript
// Subscribe to opponent presence
const opponentUid = multiplayerMeta.value[opponentKey.value]
if (opponentUid) {
  subscribeToOpponentPresence(opponentUid)
}
```

#### Turn-Based Status Updates

The presence status automatically updates when turns change:

```typescript
watch(activePlayer, async (newActive, oldActive) => {
  if (isMultiplayerGame.value && newActive) {
    if (newActive.id === selfKey.value) {
      // My turn - set status to 'playing'
      await setMyStatus('playing')
    } else if (oldActive && oldActive.id === selfKey.value) {
      // My turn ended - set status back to 'online'
      await setMyStatus('online')
    }
  }
})
```

#### UI Display (`OpponentStatusBar.vue`)

The opponent status bar displays the presence badge:

```vue
<OpponentStatusBadge
  v-if="isMultiplayerGame && opponentPresence.uid"
  :presence="opponentPresence"
  :show-text="!isMobileLandscape"
/>
```

## Configuration

### Firebase Setup

**Location**: `nuxt.config.ts`

The Realtime Database URL is configured in the Firebase config:

```typescript
firebase: {
  config: {
    // ... other config
    databaseURL: 'https://new-hanafuda-default-rtdb.firebaseio.com',
  }
}
```

### Internationalization

**Location**: `i18n/locales/*.json`

New translation keys added for presence status:

```json
{
  "multiplayer": {
    "opponent_online": "Online",
    "opponent_offline": "Offline",
    "opponent_playing": "Playing..."
  }
}
```

## Data Flow

### Initialization Flow

```
1. User creates/joins game
   ↓
2. initializePresence(gameId) called
   ↓
3. Monitor .info/connected
   ↓
4. Register onDisconnect() handler
   ↓
5. Mark user as 'online' in RTDB
   ↓
6. Subscribe to opponent's presence
   ↓
7. Display status in UI
```

### Turn Change Flow

```
1. Active player changes
   ↓
2. watch(activePlayer) triggers
   ↓
3. If my turn: setMyStatus('playing')
   ↓
4. If opponent's turn: setMyStatus('online')
   ↓
5. Opponent sees status update in real-time
```

### Disconnect Flow

```
1. Network disconnects / client crashes
   ↓
2. RTDB detects disconnection
   ↓
3. onDisconnect() handler fires automatically
   ↓
4. User marked as 'offline' in RTDB
   ↓
5. Opponent sees status change immediately
```

## State Management

Presence state is managed using Nuxt's `useState` for global reactivity:

```typescript
const opponentPresence = useState<PresenceState>('opponent-presence', () => ({
  uid: '',
  state: 'unknown',
  lastSeen: null,
  currentGameId: null,
}))
```

This allows any component to access opponent presence via:

```typescript
const { opponentPresence } = usePresence()
```

## Error Handling

- **Connection Failures**: Logged but don't block game functionality
- **Missing Opponent Data**: Defaults to `'unknown'` state
- **Authentication Errors**: Presence initialization skipped if user not authenticated
- **Cleanup Errors**: Logged but don't throw

## Performance Considerations

1. **Separate Databases**: Presence in RTDB, game state in Firestore
   - Reduces load on Firestore
   - Lower latency for presence updates
   - Better scalability

2. **Keepalive Listener**: Prevents Android disconnects
   - Empty listener on `.info/connected` keeps connection alive
   - Prevents 60-second timeout on mobile devices

3. **Reactive Updates**: Uses Vue's reactivity system
   - Only re-renders when presence actually changes
   - Computed properties for derived state

4. **Cleanup**: Properly unsubscribes on component unmount
   - Prevents memory leaks
   - Reduces unnecessary network traffic

## Security

- Presence data is user-scoped (`/presence/{uid}`)
- Only authenticated users can set their own presence
- Opponent presence is read-only for other users
- No sensitive game data in presence structure

## Future Enhancements

Potential improvements:

1. **Typing Indicators**: Show when opponent is selecting a card
2. **Connection Quality**: Display network quality indicators
3. **Reconnection Handling**: Auto-reconnect with exponential backoff
4. **Presence History**: Track presence patterns for analytics
5. **Multi-Game Support**: Handle presence across multiple simultaneous games

## Testing Considerations

When testing presence:

1. **Network Simulation**: Test with network throttling/disconnection
2. **Multiple Tabs**: Verify presence updates across browser tabs
3. **Mobile Testing**: Test keepalive behavior on Android devices
4. **Crash Simulation**: Verify `onDisconnect()` triggers on crashes
5. **Race Conditions**: Test rapid turn changes

## Troubleshooting

### Presence Not Updating

- Check Firebase RTDB connection in browser console
- Verify `databaseURL` is correctly configured
- Check network connectivity
- Verify user is authenticated

### Status Stuck on "Unknown"

- Opponent may not have initialized presence yet
- Check opponent's RTDB connection
- Verify opponent UID is correct

### Disconnect Not Detected

- Ensure `onDisconnect()` is registered before going online
- Check RTDB connection status
- Verify Firebase rules allow presence writes

## Related Files

- `app/composables/usePresence.ts` - Core presence logic
- `app/components/multiplayer/OpponentStatusBadge.vue` - Status display component
- `app/components/OpponentStatusBar.vue` - Integration point
- `app/composables/useMultiplayerMatch.ts` - Game creation/joining
- `app/pages/index.vue` - Game initialization and turn handling
- `types/profile.ts` - TypeScript types
- `nuxt.config.ts` - Firebase configuration
- `i18n/locales/*.json` - Translations

