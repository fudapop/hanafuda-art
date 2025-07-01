# Softlock Issue Investigation (GitHub Issue #26)

## Date: 2024-03-15

## Issue Description

The game softlocks if neither player gets enough cards to score any points in a round.

## Initial Exploration and Hypothesis

### Files Reviewed:

*   `stores/gameDataStore.ts`
*   `stores/playerStore.ts`
*   `utils/yaku.ts`
*   `utils/cards.ts`
*   `composables/useCardHandler.ts`

### Key Observations:

*   **`stores/gameDataStore.ts`**:
    *   Manages round progression (`startRound`, `endRound`, `nextRound`).
    *   Tracks game state (round number, turn number, current phase).
    *   `endRound()` has a condition: `if (!getCurrent.value.result) saveResult({ round: roundCounter.value, winner: null, score: 0 });`. This suggests that if a round ends without a result (e.g., no points scored), it defaults to a draw with 0 points.
*   **`stores/playerStore.ts`**:
    *   Manages player-specific data (active player, dealer).
    *   Score updating logic seems to be commented out (`// updateScore`). This might be relevant as the issue is score-related.
*   **`utils/yaku.ts`**:
    *   Defines "Yaku" (scoring combinations) and their point values.
    *   `checkAll()` calculates the total score based on collected cards.
*   **`composables/useCardHandler.ts`**:
    *   Handles card selections and matches.

### Hypothesis for Softlock:

The softlock might occur if `endRound()` is called, but the game doesn't transition to the `gameOver` state or allow progression to `nextRound()` correctly. This could happen if:

1.  `roundOver.value` is set to `true` in `endRound()`.
2.  The conditions for `gameOver.value = true` are not met (i.e., `roundCounter.value < useConfigStore().maxRounds` AND `pointsExhausted.value` is false).
3.  The game then waits for an event or player interaction to call `nextRound()`. If no points are scored, this trigger might be missing, or the UI might not present the option to proceed.

## Next Steps (Based on Plan)

1.  Develop a test case to reproduce the softlock scenario.
2.  Run the test to confirm the softlock.
3.  Implement a fix, likely in `stores/gameDataStore.ts`.
4.  Verify the fix with the test suite.
5.  Submit changes.
