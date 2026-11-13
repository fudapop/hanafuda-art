/**
 * @fileoverview Registers the PWA service worker and applies updates off the board.
 *
 * Checks for a new worker on load, when the installed app is brought back,
 * when the network returns, and every 15 minutes.
 * A downloaded update reloads the document only after a quiet moment on a
 * safe screen. An active game, multiplayer lobby, or results view keeps the
 * current page. Reload does not clear localStorage or IndexedDB.
 *
 * @example
 * ```ts
 * const { notice, requestApply } = useAppUpdate()
 * ```
 */

import {
  isTextEntryElement,
  startPwaUpdateMonitor,
  type PwaUpdateBlock,
  type PwaUpdateNotice,
  type PwaUpdateScene,
} from '~/utils/pwaUpdate'

type UpdateMonitor = ReturnType<typeof startPwaUpdateMonitor>

const started = { current: false }
let monitor: UpdateMonitor | null = null

export const useAppUpdate = () => {
  const notice = useState<PwaUpdateNotice>('pwa-update-notice', () => 'hidden')
  const blocks = useState<PwaUpdateBlock[]>('pwa-update-blocks', () => [])
  const gate = usePwaUpdateGate()

  const scene = (): PwaUpdateScene => ({
    gameInProgress: gate.gameInProgress.value,
    viewingResults: gate.viewingResults.value,
    playAgainPending: gate.playAgainPending.value,
    lobbyOpen: gate.lobbyOpen.value,
    interactionHold: gate.interactionHold.value,
    textEntryFocused: isTextEntryElement(
      typeof document === 'undefined' ? null : document.activeElement,
    ),
  })

  if (import.meta.client && !started.current && !import.meta.env.VITEST) {
    started.current = true
    monitor = startPwaUpdateMonitor({
      dev: import.meta.dev,
      getSnapshot: scene,
      onChange: (view) => {
        notice.value = view.notice
        blocks.value = view.blocks
      },
    })

    const stopWatch = watch(
      () => [
        gate.gameInProgress.value,
        gate.lobbyOpen.value,
        gate.holds.value,
        gate.playAgainPending.value,
        gate.viewingResults.value,
      ],
      () => monitor?.sync(),
    )
    onScopeDispose(() => {
      stopWatch()
      monitor?.dispose()
      monitor = null
      started.current = false
    })
  }

  return {
    notice: readonly(notice),
    blocks: readonly(blocks),
    requestApply: () => monitor?.requestApply() ?? false,
  }
}
