/**
 * @fileoverview Registers the PWA service worker and applies updates off the board.
 *
 * Checks for a new worker on load, when the installed app is brought back,
 * when the network returns, and every {@link PWA_UPDATE_CHECK_INTERVAL_MS}.
 * A downloaded update reloads the document only after a quiet moment on a
 * safe screen. An active game, multiplayer lobby, or results view keeps the
 * current page. Reload does not clear localStorage or IndexedDB.
 *
 * @example
 * ```ts
 * const { notice, requestApply } = useAppUpdate()
 * ```
 */

import { type Ref } from 'vue'
import {
  activateWaitingWorker,
  createPwaUpdateController,
  installedWorkerIsAhead,
  isTextEntryElement,
  nextUpdateReady,
  PWA_UPDATE_CHECK_INTERVAL_MS,
  PWA_UPDATE_MIN_CHECK_GAP_MS,
  pwaServiceWorkerRegistration,
  type PwaUpdateBlock,
  type PwaUpdateNotice,
  type PwaUpdateSnapshot,
} from '~/utils/pwaUpdate'

type UpdateController = ReturnType<typeof createPwaUpdateController>

const started = { current: false }
let controller: UpdateController | null = null

export const useAppUpdate = () => {
  const notice = useState<PwaUpdateNotice>('pwa-update-notice', () => 'hidden')
  const blocks = useState<PwaUpdateBlock[]>('pwa-update-blocks', () => [])
  const gate = usePwaUpdateGate()
  const updateReady = useState('pwa-update-ready', () => false)

  const snapshot = (): PwaUpdateSnapshot => ({
    updateReady: updateReady.value,
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
    startPwaUpdates({
      getSnapshot: snapshot,
      updateReady,
      onChange: (view) => {
        notice.value = view.notice
        blocks.value = view.blocks
      },
    })
  }

  const requestApply = () => controller?.requestApply() ?? false

  return {
    notice: readonly(notice),
    blocks: readonly(blocks),
    requestApply,
  }
}

function startPwaUpdates(input: {
  getSnapshot: () => PwaUpdateSnapshot
  updateReady: Ref<boolean>
  onChange: (view: { notice: PwaUpdateNotice; blocks: PwaUpdateBlock[] }) => void
}) {
  if (!('serviceWorker' in navigator)) return

  let registration: ServiceWorkerRegistration | null = null
  let lastCheck = 0
  let removed = false
  const cleanups: Array<() => void> = []

  const refreshReady = () => {
    if (!registration) return
    const controllerWorker = navigator.serviceWorker.controller
    input.updateReady.value = nextUpdateReady(
      input.updateReady.value,
      installedWorkerIsAhead({
        hasController: controllerWorker != null,
        hasWaitingWorker: registration.waiting != null,
        activeIsController: registration.active == null || registration.active === controllerWorker,
      }),
    )
    controller?.sync()
  }

  const checkForUpdate = async (force: boolean) => {
    if (!registration || removed) return
    if (typeof navigator.onLine === 'boolean' && !navigator.onLine) return
    if (registration.installing) return
    const now = Date.now()
    if (!force && now - lastCheck < PWA_UPDATE_MIN_CHECK_GAP_MS) return
    lastCheck = now
    try {
      await registration.update()
    } catch {
      // Offline or the browser throttled the check. The current precache
      // keeps offline play working.
    }
    refreshReady()
  }

  controller = createPwaUpdateController({
    getSnapshot: input.getSnapshot,
    onChange: input.onChange,
    checkIntervalMs: PWA_UPDATE_CHECK_INTERVAL_MS,
    schedule: {
      delay(ms, fn) {
        const id = window.setTimeout(fn, ms)
        return { cancel: () => window.clearTimeout(id) }
      },
      interval(ms, fn) {
        const id = window.setInterval(fn, ms)
        return { cancel: () => window.clearInterval(id) }
      },
    },
    client: {
      checkForUpdate: () => checkForUpdate(false),
      activateWaitingWorker: async () => {
        if (!registration) return false
        const waiting = registration.waiting
        if (waiting) return activateWaitingWorker(waiting)
        const controllerWorker = navigator.serviceWorker.controller
        const active = registration.active
        return controllerWorker != null && active != null && active !== controllerWorker
      },
      reload() {
        // A normal reload keeps localStorage, sessionStorage, and IndexedDB.
        window.location.reload()
      },
    },
  })

  const onFocus = () => {
    controller?.sync()
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') void checkForUpdate(false)
  }

  const onOnline = () => {
    void checkForUpdate(true)
  }

  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) void checkForUpdate(true)
  }

  window.addEventListener('focusin', onFocus)
  window.addEventListener('focusout', onFocus)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  window.addEventListener('pageshow', onPageShow)
  cleanups.push(() => {
    window.removeEventListener('focusin', onFocus)
    window.removeEventListener('focusout', onFocus)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('pageshow', onPageShow)
  })

  const gate = usePwaUpdateGate()
  const stopWatch = watch(
    () => [
      gate.gameInProgress.value,
      gate.lobbyOpen.value,
      gate.holds.value,
      gate.playAgainPending.value,
      gate.viewingResults.value,
      input.updateReady.value,
    ],
    () => controller?.sync(),
  )
  cleanups.push(() => stopWatch())

  const { scriptURL, options } = pwaServiceWorkerRegistration(import.meta.dev)
  navigator.serviceWorker
    .register(scriptURL, options)
    .then((next) => {
      if (removed) return
      registration = next
      const initialController = navigator.serviceWorker.controller
      const onControllerChange = () => {
        const nextController = navigator.serviceWorker.controller
        if (initialController && nextController && nextController !== initialController) {
          refreshReady()
        }
      }
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
      cleanups.push(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      })

      const track = (worker: ServiceWorker | null) => {
        if (!worker) return
        const onState = () => {
          if (worker.state === 'installed' || worker.state === 'activated') refreshReady()
        }
        worker.addEventListener('statechange', onState)
      }
      track(next.installing)
      track(next.waiting)
      next.addEventListener('updatefound', () => track(next.installing))
      refreshReady()
      void checkForUpdate(true)
    })
    .catch((error: unknown) => {
      console.error('Service worker registration failed', error)
    })

  onScopeDispose(() => {
    removed = true
    controller?.dispose()
    controller = null
    started.current = false
    for (const cleanup of cleanups) cleanup()
  })
}
