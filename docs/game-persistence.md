# Game Persistence with IndexedDB

The `useGamePersistence` composable provides comprehensive game state management using IndexedDB for the Hanafuda card game. This enables players to save and resume games, supporting PWA offline functionality.

## Features

### Core Functionality
- **Complete Game State Persistence**: Saves all game data including cards, player states, round history, and configuration
- **Multiple Save Slots**: Support for named save slots with timestamps and game previews
- **Auto-save**: Automatic game state preservation during gameplay
- **Browser Support Detection**: Graceful degradation when IndexedDB is not available
- **Error Handling**: Comprehensive error management with user-friendly messages

### PWA Readiness
- **Offline Support**: Full functionality without network connection
- **Cross-session Persistence**: Game state survives browser restarts and device reboots
- **Storage Quotas**: Efficient storage usage with structured data organization

## Usage

### Basic Setup

```typescript
// In your component
const {
  isSupported,
  isInitialized,
  error,
  saveGame,
  loadGame,
  getSavedGames,
  deleteSave,
  autoSave
} = useGamePersistence()
```

### Saving Games

```typescript
// Manual save with custom name
const saveId = await saveGame('Before Boss Battle')

// Auto-save (only during active gameplay)
const autoSaveId = await autoSave()
```

### Loading Games

```typescript
// Get all saved games
const savedGames = await getSavedGames()

// Load specific game
await loadGame(saveId)
```

### Save Management

```typescript
// Delete a save
await deleteSave(saveId)

// Clear all saves (for testing)
await clearAllSaves()
```

## Data Structure

### GameSaveData
```typescript
interface GameSaveData {
  id: string
  timestamp: number
  version: string
  gameState: {
    cards: CardStoreState      // Card positions and collections
    players: PlayerState       // Player information and states
    gameData: GameDataState    // Round history, turn counters, phase
    config: GameSettings       // Game configuration and options
  }
  metadata: {
    gameType: 'hanafuda'
    platform: 'web'
    userAgent: string
  }
}
```

### SaveSlot (Preview)
```typescript
interface SaveSlot {
  id: string
  name: string
  timestamp: number
  preview: {
    round: number
    turn: number
    phase: string
    score: { p1: number; p2: number }
  }
}
```

## Implementation Details

### IndexedDB Schema
- **Database**: `HanafudaGameDB`
- **Version**: 1
- **Stores**:
  - `gameSaves`: Complete game state data
  - `profile`: Local profile data (future)
  - `settings`: Persistent settings (future)

### Store-Specific Handling
- **Card Store**: Sets are serialized to Arrays for JSON storage and restored to Sets on load
- **Player Store**: Uses standard Pinia `$patch` for state restoration
- **Game Data Store**: Individual property assignment due to composition API structure
- **Config Store**: Standard Pinia `$patch` for configuration data

### Serialization Strategy
- **Reactive Data**: Uses `toRaw()` to extract pure values from Vue reactivity
- **Sets**: Converted to Arrays for JSON serialization
- **Deep Cloning**: JSON.parse(JSON.stringify()) for complex objects

## Future Extensibility

### Offline Profile Management
The composable includes foundation methods for local profile persistence:

```typescript
// Save profile data locally
await saveProfile(profileData)

// Load local profile
const profile = await loadProfile()
```

Profile data includes a `needsSync` flag for future Firestore synchronization.

### Firestore Sync Integration
When implementing cloud sync:

1. **Conflict Resolution**: Compare timestamps between local and cloud saves
2. **Merge Strategy**: Implement user choice for conflicting data
3. **Sync Queue**: Queue operations when offline and sync when online
4. **Data Compression**: Consider compression for large save files

### Potential Enhancements

#### Auto-save Triggers
```typescript
// Add watchers for automatic saves
watch(() => gameDataStore.turnCounter, () => {
  autoSave()
})

watch(() => gameDataStore.roundCounter, () => {
  saveGame(`Round ${gameDataStore.roundCounter} Complete`)
})
```

#### Save File Management
```typescript
// Export save to file
const exportSave = async (saveId: string) => {
  const saveData = await getSaveData(saveId)
  const blob = new Blob([JSON.stringify(saveData)], { type: 'application/json' })
  // Trigger download...
}

// Import save from file
const importSave = async (file: File) => {
  const text = await file.text()
  const saveData = JSON.parse(text)
  // Validate and store...
}
```

#### Save Compression
```typescript
// For large save files, consider compression
import { compress, decompress } from 'lz-string'

const compressedData = compress(JSON.stringify(saveData))
const decompressedData = JSON.parse(decompress(compressedData))
```

## Error Handling

The composable provides comprehensive error handling:

- **Browser Support**: Detects IndexedDB availability
- **Database Errors**: Catches and reports database operation failures
- **Validation**: Ensures save data integrity before operations
- **User Feedback**: Reactive error state for UI feedback

## Testing Considerations

### Unit Tests
```typescript
// Test save/load cycle
it('should preserve game state through save/load cycle', async () => {
  const originalState = getGameState()
  const saveId = await saveGame('test')
  
  // Modify state
  modifyGameState()
  
  // Load and verify
  await loadGame(saveId)
  expect(getGameState()).toEqual(originalState)
})
```

### Integration Tests
- Test with various game states (beginning, middle, end of game)
- Verify IndexedDB storage limits
- Test offline/online scenarios
- Validate save file corruption handling

## Performance Considerations

- **Lazy Initialization**: Database is only opened when first used
- **Batch Operations**: Consider batching multiple save operations
- **Storage Cleanup**: Implement automatic cleanup of old saves
- **Memory Usage**: Be mindful of loading large save files into memory

## Security Notes

- **Local Storage Only**: IndexedDB data remains on user's device
- **No Sensitive Data**: Avoid storing authentication tokens or sensitive information
- **Version Control**: Include version information for future migration support
- **Validation**: Always validate loaded data before restoring to stores

## Browser Compatibility

- **Modern Browsers**: Full support in Chrome, Firefox, Safari, Edge
- **Progressive Enhancement**: Graceful degradation when unavailable
- **Storage Quotas**: Respect browser storage limitations
- **Private Mode**: Handle private browsing mode limitations