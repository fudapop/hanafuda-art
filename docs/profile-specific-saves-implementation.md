# Profile-Specific Game Saves Implementation

This document summarizes the implementation of profile-specific game save states for the Hanafuda game.

## ✅ Completed Features

### 1. **Exit Warning with Save Options**
- **Location**: `components/modal/ExitWarning.vue`
- **Functionality**: 
  - Offers three options: "Save & Exit", "Exit Without Saving", "Keep Playing"
  - Automatically saves game state when user chooses "Save & Exit"
  - Handles save failures gracefully with fallback to discard confirmation

### 2. **Start Screen with Resume Game**
- **Location**: `components/NewStartScreen.vue`  
- **Functionality**:
  - Shows "Resume Game" button when save exists for current profile
  - Shows save details (round, turn, timestamp)
  - Changes "Play Now" to "New Game" when save exists
  - Warns before discarding saves when starting new game
  - Profile-aware save checking and loading

### 3. **Profile-Specific Save System**
- **Location**: `composables/useGamePersistence.ts`
- **Key Changes**:
  - **Single save per profile**: Each user gets one save slot identified by their UID
  - **Profile isolation**: Users can't see or access other users' saves
  - **Guest vs Registered**: Both guest and registered users get separate save spaces
  - **Automatic cleanup**: Old saves are replaced when new saves are created

### 4. **Updated Components and Helpers**
- **GameLayout**: Updated to handle new exit warning data structure
- **GameSaveManager**: Modified for single-save-per-profile approach
- **Helper functions**: Updated to use profile-specific methods

## 🔧 Technical Implementation

### Save ID Structure
```typescript
// Before: Random unique IDs
const saveId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// After: Profile-based IDs  
const saveId = `save_${profileId}` // One save per profile
```

### Profile Identification
```typescript
const getCurrentProfileId = (): string => {
  const { current } = useProfile()
  return current.value?.uid || 'anonymous'
}
```

### Save Data Structure
```typescript
interface SaveSlot {
  id: string
  name: string
  timestamp: number
  profileId: string  // NEW: Associates save with profile
  preview: {
    round: number
    turn: number
    phase: string
    score: { p1: number; p2: number }
  }
}
```

## 🎯 User Experience Flow

### Starting a Game
1. **No save exists**: Show "PLAY NOW" button
2. **Save exists**: Show "RESUME GAME" (primary) and "NEW GAME" (secondary)
3. **New game with save**: Warn user about discarding progress

### Leaving a Game
1. **Exit button pressed**: Show 3-option modal
2. **Save & Exit**: Automatically save and return to start screen
3. **Exit without saving**: Discard progress and return to start screen
4. **Keep playing**: Cancel and continue game

### Profile Switching
1. **Different user logs in**: Only sees their own saves
2. **Guest to registered**: Saves remain separate
3. **Multiple browser sessions**: Each profile maintains independent saves

## 🔐 Data Isolation

### Guest Users
- Save ID: `save_${anonymousUID}`
- Storage: IndexedDB (temporary for session)
- Isolation: Each anonymous session gets unique UID

### Registered Users  
- Save ID: `save_${userUID}`
- Storage: IndexedDB (persistent)
- Isolation: Firebase Auth UID ensures uniqueness

### Cross-Profile Security
- **No data leakage**: Users cannot access other profiles' saves
- **Automatic cleanup**: Old profile saves are not visible to new profiles
- **Session isolation**: Browser sessions maintain separate save states

## 📱 PWA Considerations

### Offline Functionality
- **Full offline support**: All save/load operations work without network
- **IndexedDB persistence**: Data survives browser restarts and device reboots
- **Graceful degradation**: Falls back to in-memory state when IndexedDB unavailable

### Storage Management
- **One save per profile**: Prevents storage bloat
- **Automatic overwrites**: New saves replace old ones for same profile
- **Efficient serialization**: Sets converted to Arrays for JSON storage

## 🧪 Testing

### Manual Testing Scenarios
1. **Save and resume**: Create save, restart browser, verify resume works
2. **Profile switching**: Login as different users, verify save isolation
3. **Guest vs registered**: Test both user types maintain separate saves
4. **Edge cases**: Test with no saves, corrupted saves, storage failures

### Demo Component
- **Location**: `examples/game-persistence-demo.vue`
- **Purpose**: Interactive demo showing all persistence features
- **Features**: Create test saves, load saves, delete saves, view profile info

## 🔮 Future Enhancements

### Cloud Sync Integration
- **Firestore sync**: Sync local saves with cloud storage
- **Conflict resolution**: Handle save conflicts between devices
- **Backup/restore**: Export/import save files for backup

### Enhanced Save Management
- **Multiple save slots**: Allow users to maintain multiple saves
- **Save naming**: Custom names for save slots
- **Save screenshots**: Visual previews of save states

### Performance Optimizations
- **Save compression**: Compress large save files
- **Background saves**: Save during game transitions
- **Delta saves**: Only save changed data

## 📋 API Reference

### New Methods
```typescript
// Profile-specific methods
hasCurrentProfileSave(): Promise<boolean>
getCurrentProfileSave(): Promise<SaveSlot | null>
deleteCurrentProfileSave(): Promise<void>
loadCurrentProfileGame(): Promise<void>

// Helper functions
hasSavedGames(): Promise<boolean>  // Now profile-aware
getMostRecentSave(): Promise<SaveSlot | null>  // Now returns current profile save
```

### Updated Methods
```typescript
// saveGame now overwrites previous save for same profile
saveGame(slotName?: string): Promise<string>

// getSavedGames now filters by current profile
getSavedGames(): Promise<SaveSlot[]>
```

This implementation provides a robust, user-friendly save system that's ready for PWA deployment with future extensibility for cloud sync and enhanced features.