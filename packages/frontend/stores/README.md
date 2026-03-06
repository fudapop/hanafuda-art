# Stores Directory

This directory contains the Pinia state management stores for New Hanafuda's game logic and data persistence.

## Store Architecture

The store system is designed with clean separation of concerns, where each store manages a specific aspect of the game while coordinating seamlessly with others.

### Core Stores

#### 🃏 [cardStore.ts](./cardStore.ts)
**Purpose**: Card position and movement management

Tracks all card locations and handles atomic card operations with integrity checking.

```typescript
const cardStore = useCardStore()
cardStore.dealCards()                    // Deal initial hands and field
cardStore.discard('matsu-ni-tsuru', 'p1') // Move card from hand to field
cardStore.collectCards('p1')             // Collect staged cards
```

**Key Features**:
- Hand, field, deck, and collection tracking
- Atomic card operations with validation
- Integrity checking (48-card deck consistency)
- Hash-based serialization for anti-tampering

#### 🎯 [gameDataStore.ts](./gameDataStore.ts) 
**Purpose**: Game flow coordination and progression

Manages turn phases, rounds, scoring, and overall game state transitions.

```typescript
const gameData = useGameDataStore()
gameData.startRound()                    // Initialize new round
gameData.nextPhase()                     // Progress: select → draw → collect
gameData.saveResult({ winner: 'p1', score: 15 })
gameData.endRound()
```

**Key Features**:
- Turn-based phase management (select/draw/collect)
- Round and match progression
- Score calculation and history
- Game state validation

#### 👥 [playerStore.ts](./playerStore.ts)
**Purpose**: Player data and turn management

Handles player identification, active/inactive states, and dealer rotation.

```typescript
const playerStore = usePlayerStore()
const current = playerStore.activePlayer  // Get current player
playerStore.toggleActivePlayer()          // Switch turns
playerStore.reset('p2')                   // Set p2 as new dealer
playerStore.incrementBonus()              // Koi-koi bonus multiplier
```

**Key Features**:
- Two-player support (p1, p2)
- Active player and turn switching
- Dealer role management
- Bonus multiplier for koi-koi scoring

#### ⚙️ [configStore.ts](./configStore.ts)
**Purpose**: Game configuration and preferences

Manages rule variations, user preferences, and game settings.

```typescript
const configStore = useConfigStore()
configStore.loadUserSettings({
  rounds: 6,
  viewings: 'limited',
  double: true,
  wild: false
})

const finalScore = configStore.applyDoubleScoreOption(8) // Returns 16
```

**Key Features**:
- Game length configuration (3/6/12 rounds)
- Yaku viewing restrictions
- Scoring rule variations
- UI preferences (card size, labels)

## Store Coordination

### Game Flow Example

```typescript
// 1. Initialize game
const cardStore = useCardStore()
const gameData = useGameDataStore() 
const playerStore = usePlayerStore()

// 2. Start new round
gameData.startRound()           // Sets up round state
cardStore.dealCards()           // Deals initial cards
// playerStore automatically tracks active player

// 3. Take turn
if (gameData.checkCurrentPhase('select')) {
  cardStore.discard(selectedCard, playerStore.activePlayer.id)
  gameData.nextPhase()          // Move to 'draw' phase
}

// 4. End turn
gameData.nextPhase()            // Move to 'collect' phase  
playerStore.toggleActivePlayer() // Switch to other player
```

### Inter-Store Dependencies

```
gameDataStore ←→ playerStore    (active player, dealer rotation)
gameDataStore ←→ cardStore      (round initialization, hand checking)
gameDataStore ←→ configStore    (round limits, scoring rules)
cardStore     ←→ configStore    (wild card rules)
```

## State Persistence

### Serialization System

Each store implements standardized serialization methods:

- `exportSerializedState()`: Returns JSON string of store state
- `importSerializedState(data)`: Restores state from JSON string

The [useStoreManager](../composables/useStoreManager.ts) composable orchestrates persistence across all stores with anti-save scumming protection:

```typescript
const { quickSave, quickLoad, listSavedGames } = useStoreManager()

const saveKey = quickSave()      // Save to single slot (exit dialog only)
const saves = listSavedGames()   // Check for suspended game (max 1)
const success = quickLoad()      // Resume game (deletes save after load)
```

**Anti-Save Scumming System:**
- Only one save slot allowed (`hanafuda-current-save`)
- Save only accessible through "Save & Exit" dialog
- Save automatically deleted when resumed
- No manual save/load during gameplay

### Security Features

- **Hash-based integrity protection** prevents save tampering
- **Version compatibility** checking for safe loading
- **Atomic operations** ensure consistent state transitions
- **Input validation** at all store boundaries

## Testing

Each store has comprehensive test coverage in `__tests__/stores/`:

- State initialization and defaults
- Action methods and state mutations
- Store coordination and dependencies  
- Persistence and hydration behavior
- Error handling and edge cases

Run store tests:
```bash
pnpm test stores/
```

## Usage Patterns

### In Composables

```typescript
// Access multiple stores in business logic
export const useGameLogic = () => {
  const cardStore = useCardStore()
  const gameData = useGameDataStore() 
  const playerStore = usePlayerStore()
  
  const playCard = (card: CardName) => {
    if (gameData.checkCurrentPhase('select')) {
      cardStore.discard(card, playerStore.activePlayer.id)
      gameData.nextPhase()
    }
  }
  
  return { playCard }
}
```

### In Components

```vue
<script setup lang="ts">
// Use reactive store references
const gameData = useGameDataStore()
const { activePlayer } = storeToRefs(usePlayerStore())
const { hand } = storeToRefs(useCardStore())

// Access computed state
const currentPhase = computed(() => gameData.getCurrent.phase)
const playerCards = computed(() => hand.value[activePlayer.value.id])
</script>
```

## Best Practices

1. **Single Responsibility**: Each store manages one domain
2. **Reactive Updates**: Use `storeToRefs()` for reactive data
3. **Type Safety**: Leverage TypeScript interfaces for all state
4. **Atomic Operations**: Group related state changes in single actions
5. **Error Handling**: Validate inputs and handle edge cases
6. **Testing**: Maintain comprehensive test coverage

## Store State Shapes

For detailed TypeScript interfaces and complete API documentation, see the individual store files:

- [`CardStoreState`](./cardStore.ts#L43) - Card positions and collections
- [`GameDataStoreState`](./gameDataStore.ts#L65) - Game progression and history  
- [`PlayerStoreState`](./playerStore.ts#L57) - Player data and turn state
- [`ConfigStoreState`](./configStore.ts#L81) - Settings and preferences