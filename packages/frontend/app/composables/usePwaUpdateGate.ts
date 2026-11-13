/**
 * @fileoverview Shared flags that keep a PWA reload from interrupting play.
 *
 * The service worker updater reads these flags. Game screens set them.
 * `useState('start')`, `useState('play-again')`, and `useState('game-results-snapshot')`
 * are the same keys the board, results page, and title screen already use.
 *
 * @example
 * ```ts
 * const { acquire } = usePwaUpdateGate()
 * const release = acquire()
 * try {
 *   await saveAndLeave()
 * } finally {
 *   release()
 * }
 * ```
 */

export const usePwaUpdateGate = () => {
  const gameInProgress = useState('start', () => false)
  const lobbyOpen = useState('pwa-lobby-open', () => false)
  const holds = useState('pwa-update-holds', () => 0)
  const playAgainPending = useState('play-again', () => false)
  const resultsSnapshot = useState<unknown>('game-results-snapshot', () => null)

  /**
   * Hold reloads until the returned function runs. A second call is a no-op,
   * so a screen can release from both `finally` and `onUnmounted`.
   */
  const acquire = () => {
    holds.value += 1
    let released = false
    return () => {
      if (released) return
      released = true
      holds.value = Math.max(0, holds.value - 1)
    }
  }

  const viewingResults = computed(() => resultsSnapshot.value != null)
  const interactionHold = computed(() => holds.value > 0)

  return {
    gameInProgress,
    lobbyOpen,
    holds,
    playAgainPending,
    viewingResults,
    interactionHold,
    acquire,
  }
}
