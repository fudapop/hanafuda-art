import type { PlayerKey } from '~~/stores/playerStore'
import type { YakuName } from '~/utils/yaku'
import { useGameDataStore } from '~~/stores/gameDataStore'
import { useCardStore } from '~~/stores/cardStore'
import { sortByType } from '~/utils/cards'
import { useProfile } from './useProfile'

/**
 * Composable for real-time tracking of player statistics during gameplay.
 * Watches the game event history and tracks koi-koi calls and yaku completions
 * as they happen, avoiding race conditions with event history clearing.
 */
export const useStatsTracking = () => {
  const ds = useGameDataStore()
  const cs = useCardStore()
  const { updatePlayerStats } = useProfile()
  type PlayerStatsUpdates = Parameters<typeof updatePlayerStats>[0]

  // Real-time tracking of koi-koi calls and yaku completions for current round
  const currentRoundKoikoiCalls: Ref<Array<{ player: PlayerKey; timestamp: number }>> = ref([])
  const currentRoundYakuCompletions: Ref<
    Array<{ player: PlayerKey; yaku: YakuName; timestamp: number }>
  > = ref([])

  // Store watch stop functions for cleanup
  const watchers: Array<() => void> = []

  // Track the last processed event index to avoid reprocessing
  let lastProcessedIndex = -1

  // Watch for new events in real-time by watching the array length
  const stopEventWatch = watch(
    () => ds.eventHistory.length,
    (newLength, oldLength) => {
      // Remove excessive logging, retain only concise tracing if necessary

      // Process all new events since last check
      for (let i = lastProcessedIndex + 1; i < ds.eventHistory.length; i++) {
        const event = ds.eventHistory[i]

        if (event?.type === 'player') {
          // Track koi-koi calls
          if (event.action === 'koi-koi') {
            currentRoundKoikoiCalls.value.push({
              player: event.player,
              timestamp: event.timestamp,
            })
          }

          // Track yaku completions (only during active gameplay, not when showing results)
          if (event.action === 'complete' && event.yaku && !ds.roundOver) {
            currentRoundYakuCompletions.value.push({
              player: event.player,
              yaku: event.yaku,
              timestamp: event.timestamp,
            })
          }
        }
      }

      lastProcessedIndex = ds.eventHistory.length - 1
    },
  )
  watchers.push(stopEventWatch)

  /**
   * Internal function to process and save all tracked stats for the completed round.
   *
   * @param winner - The winner of the round ('p1', 'p2', or null for draw)
   */
  const processRoundStats = async (winner: PlayerKey | null) => {
    // Only retain minimal logging if needed. Commented out detailed debug logs.
    // console.debug('Processing round stats for winner:', winner);

    // Collect all stat operations to send in a single batch
    const allOperations: PlayerStatsUpdates = []

    // Track koi-koi calls if there was a winner
    const p1KoikoiCalls = currentRoundKoikoiCalls.value.filter((call) => call.player === 'p1')
    const hasOpponentKoikoi = currentRoundKoikoiCalls.value.some((call) => call.player === 'p2')
    const p1Wins = winner === 'p1'

    const koikoiOps = [
      {
        key: p1Wins ? 'koikoiCalled_success' : 'koikoiCalled_fail',
        op: 'increment' as const,
        value: +(p1KoikoiCalls.length > 0), // 1 if p1 wins after calling
      },
      {
        key: 'koikoiCalled_stack',
        op: 'increment' as const,
        value: +(p1KoikoiCalls.length > 1), // 1 if multiple calls, 0 if single
      },
      {
        key: 'koikoiCalled_reversal',
        op: 'increment' as const,
        value: +(p1Wins && hasOpponentKoikoi), // 1 if p1 wins after opponent called, 0 if not
      },
    ].filter((op) => op.value > 0) as PlayerStatsUpdates // Only include operations that actually change something

    allOperations.push(...koikoiOps)

    // Track yaku completions for this round
    const p1YakuCompletions = currentRoundYakuCompletions.value.filter(
      (completion) => completion.player === 'p1',
    )

    if (p1YakuCompletions.length > 0) {
      const yakuOps = [
        {
          key: 'totalYakuCompleted',
          op: 'increment' as const,
          value: p1YakuCompletions.length,
        },
        // Update individual yaku completion stats
        ...p1YakuCompletions.map((completion) => ({
          key: `yakuCompleted_${completion.yaku}`,
          op: 'increment' as const,
          value: 1,
        })),
      ]
      allOperations.push(...(yakuOps as PlayerStatsUpdates))
    }

    // Track cards captured by p1 this round
    const p1Collection = [...cs.collection.p1]
    const cardsByType = sortByType(p1Collection)
    const cardCounts = {
      bright: cardsByType.brights.length,
      animal: cardsByType.animals.length,
      ribbon: cardsByType.ribbons.length,
      plain: cardsByType.plains.length,
    }

    const totalCaptured =
      cardCounts.bright + cardCounts.animal + cardCounts.ribbon + cardCounts.plain

    if (totalCaptured > 0) {
      allOperations.push(
        {
          key: 'cardsCaptured_bright',
          op: 'increment',
          value: cardCounts.bright,
        },
        {
          key: 'cardsCaptured_animal',
          op: 'increment',
          value: cardCounts.animal,
        },
        {
          key: 'cardsCaptured_ribbon',
          op: 'increment',
          value: cardCounts.ribbon,
        },
        { key: 'cardsCaptured_plain', op: 'increment', value: cardCounts.plain },
        { key: 'totalCardsCaptured', op: 'increment', value: totalCaptured },
      )
    }

    // Track round result
    const roundResultKey =
      winner === 'p1'
        ? 'roundsPlayed_win'
        : winner === 'p2'
          ? 'roundsPlayed_loss'
          : 'roundsPlayed_draw'

    allOperations.push(
      { key: roundResultKey, op: 'increment', value: 1 },
      { key: 'totalRoundsPlayed', op: 'increment', value: 1 },
    )

    // Minimal batch operation log for errors only
    try {
      if (allOperations.length > 0) {
        await updatePlayerStats(allOperations)
      }
    } catch (e) {
      // Still log errors for troubleshooting
      // eslint-disable-next-line no-console
      console.error('Failed to update player stats:', e)
    }

    // Clear the tracking arrays for the next round
    currentRoundKoikoiCalls.value = []
    currentRoundYakuCompletions.value = []
  }

  // Watch for round completion and automatically process stats
  const stopRoundOverWatch = watch(
    () => ds.roundOver,
    async (isRoundOver) => {
      if (isRoundOver) {
        const result = ds.getCurrent.result
        if (result) {
          await processRoundStats(result.winner)
        }
      }
    },
  )
  watchers.push(stopRoundOverWatch)

  // Watch for round counter changes to reset tracking arrays for new rounds
  const stopRoundCounterWatch = watch(
    () => ds.roundCounter,
    () => {
      currentRoundKoikoiCalls.value = []
      currentRoundYakuCompletions.value = []
      lastProcessedIndex = ds.eventHistory.length - 1 // Reset to current position
    },
  )
  watchers.push(stopRoundCounterWatch)

  /**
   * Cleanup function to stop all watchers.
   * Should be called when the component using this composable is unmounted.
   */
  const cleanup = () => {
    watchers.forEach((stop) => stop())
    watchers.length = 0
  }

  // Automatically cleanup on scope disposal (when component unmounts)
  onScopeDispose(() => {
    cleanup()
  })

  return {
    // Expose readonly tracking data for debugging/display purposes
    currentRoundKoikoiCalls: readonly(currentRoundKoikoiCalls),
    currentRoundYakuCompletions: readonly(currentRoundYakuCompletions),
    // Expose cleanup function for manual cleanup if needed
    cleanup,
  }
}
