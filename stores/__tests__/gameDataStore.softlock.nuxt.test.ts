import { setActivePinia, createPinia } from 'pinia';
import { useGameDataStore } from '~/stores/gameDataStore';
import { usePlayerStore } from '~/stores/playerStore';
import { useCardStore } from '~/stores/cardStore';
import { useConfigStore } from '~/stores/configStore';
import { describe, it, expect, beforeEach } from 'vitest';

// Vitest default timeout is 5000ms.
// This can be too short for tests involving multiple async operations or timeouts.
vi.setConfig({ testTimeout: 10000 });


describe('GameDataStore - Softlock Scenario', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset all stores to their initial states
    const gameDataStore = useGameDataStore();
    const playerStore = usePlayerStore();
    const cardStore = useCardStore();
    const configStore = useConfigStore();

    gameDataStore.$reset();
    playerStore.$reset();
    cardStore.$reset();
    configStore.$reset();

    // Ensure stores are initialized if they have setup functions
    // For example, if they load data from localStorage or perform async ops
    // This might require awaiting promises if such operations are async

    // Set up a basic game configuration
    configStore.maxRounds = 3; // Keep it short for testing
  });

  it('should progress to the next round or game over if no points are scored', () => {
    const gameDataStore = useGameDataStore();
    const playerStore = usePlayerStore();
    const cardStore = useCardStore();

    // Start the first round
    gameDataStore.startRound();
    expect(gameDataStore.roundCounter).toBe(1);
    expect(gameDataStore.gameOver).toBe(false);
    expect(gameDataStore.roundOver).toBe(false);

    // Simulate a round where no player scores any points
    // This typically means players collect cards but none form a Yaku (scoring hand)

    // Manually end the round without any scoring
    // In a real game, this would happen after all turns are played or a player calls "koi-koi" then fails to score more
    // For this test, we directly call endRound() assuming the conditions for it are met.

    // Ensure no player has points that would affect `pointsExhausted`
    // The default result saved by endRound if no other result is present is winner: null, score: 0
    // So, we don't need to explicitly set scores to 0 for players for this specific test path.

    gameDataStore.endRound();

    // Check that the round is marked as over
    expect(gameDataStore.roundOver).toBe(true);

    // At this point, the game should not be in a soft-locked state.
    // It should either be game over (if max rounds reached) or ready for the next round.

    if (gameDataStore.roundCounter < useConfigStore().maxRounds && !gameDataStore.pointsExhausted) {
      // If not game over, we should be able to start the next round.
      // This implies that the UI would allow the user to proceed.
      // We simulate this by calling nextRound and then startRound.

      // Call nextRound to prepare for the next round
      gameDataStore.nextRound();
      expect(gameDataStore.roundOver).toBe(false); // Reset by nextRound()

      // Attempt to start the next round
      gameDataStore.startRound();
      expect(gameDataStore.roundCounter).toBe(2); // Should have incremented
      expect(gameDataStore.gameOver).toBe(false); // Still not game over
    } else {
      // If it is game over (either max rounds or points exhausted)
      expect(gameDataStore.gameOver).toBe(true);
    }

    // Further check: if we simulate playing all rounds and no one scores,
    // the game should end gracefully.
    gameDataStore.$reset(); // Reset for a clean slate for this part of the test
    useConfigStore().maxRounds = 2; // Let's say 2 rounds

    // Round 1 - No score
    gameDataStore.startRound();
    gameDataStore.endRound(); // winner: null, score: 0 by default
    expect(gameDataStore.roundOver).toBe(true);
    expect(gameDataStore.gameOver).toBe(false); // Not yet game over

    gameDataStore.nextRound();
    expect(gameDataStore.roundOver).toBe(false);

    // Round 2 - No score
    gameDataStore.startRound();
    expect(gameDataStore.roundCounter).toBe(2);
    gameDataStore.endRound(); // winner: null, score: 0 by default
    expect(gameDataStore.roundOver).toBe(true);

    // After round 2 (maxRounds), game should be over
    expect(gameDataStore.gameOver).toBe(true);

    // Attempting to start another round should not be possible or should not change state
    // For example, a UI would not allow it, or store logic would prevent it.
    // We can check that roundCounter does not advance further.
    const currentRound = gameDataStore.roundCounter;
    gameDataStore.nextRound(); // This might reset roundOver but shouldn't allow a new round beyond max.
    gameDataStore.startRound(); // This call should ideally be guarded or not change roundCounter if gameOver.
                                // Depending on implementation, it might log an error or do nothing.
    expect(gameDataStore.roundCounter).toBe(currentRound); // Or check specifically based on expected guard behavior.
                                                          // Given the current code, startRound would proceed if roundOver is false
                                                          // Let's refine this assertion based on expected behavior of startRound when gameOver.
                                                          // The current `startRound` has: `if (roundOver.value) { console.error(...); return; }`
                                                          // `nextRound()` sets `roundOver.value = false`.
                                                          // So, `startRound()` *would* proceed if called after `nextRound()`.
                                                          // The critical check is `gameOver` being true.
    expect(gameDataStore.gameOver).toBe(true); // This must remain true.
  });
});
