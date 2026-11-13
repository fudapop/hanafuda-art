/**
 * @fileoverview Decides when a waiting PWA service worker may activate.
 *
 * `@vite-pwa/nuxt` defaults to `registerType: 'prompt'`. The module registers
 * the worker and sets `needRefresh` when a new one is waiting, but this app
 * never reads that flag, so the new worker sits idle until every window is
 * closed. `autoUpdate` is the wrong fix: its generated client reloads the page
 * as soon as the new worker activates, including during a live match.
 *
 * Activation stays under app control. The waiting worker is asked to skip
 * waiting only when the player is outside a game, and the document reloads
 * only if that is still true when activation finishes. localStorage and
 * IndexedDB are never touched — a reload keeps them, and this module does not
 * clear Cache Storage either (Workbox drops only its own previous precaches).
 */

/** How long a safe screen must stay safe before the new worker activates. */
export const PWA_UPDATE_APPLY_DELAY_MS = 3_000

/**
 * How often a long-lived tab or installed app asks the browser to check for
 * a new service worker. Visibility changes check sooner, with a short gap.
 */
export const PWA_UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000

/** Ignore visibility-triggered checks that land inside this window. */
export const PWA_UPDATE_MIN_CHECK_GAP_MS = 60_000

/** Give the waiting worker this long to activate before leaving the page alone. */
export const PWA_ACTIVATION_TIMEOUT_MS = 10_000

/** Why an available update must not reload this document yet. */
export type PwaUpdateBlock =
  | 'game'
  | 'results'
  | 'play-again'
  | 'lobby'
  | 'interaction'
  | 'text-entry'

export type PwaUpdateSnapshot = {
  /** A newer worker is waiting, or already active in another client. */
  updateReady: boolean
  /** The board is on screen, including a live multiplayer match. */
  gameInProgress: boolean
  /** The in-memory results page is showing. A reload would drop it. */
  viewingResults: boolean
  /** Results asked the title screen to start another game. */
  playAgainPending: boolean
  /** Create/join match dialog is open, including the waiting room. */
  lobbyOpen: boolean
  /** Exit confirm, save, signup prompt, or another explicit hold. */
  interactionHold: boolean
  /** The player is typing. A reload would drop the field. */
  textEntryFocused: boolean
}

export type PwaUpdateNotice = 'hidden' | 'deferred' | 'applying'

export type PwaUpdateView = {
  notice: PwaUpdateNotice
  blocks: PwaUpdateBlock[]
}

const TEXT_ENTRY_IGNORED_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

/**
 * True when a focused element holds text the player has not submitted.
 *
 * @param element - `document.activeElement`, or null when nothing is focused
 * @returns Whether a reload would discard in-progress typing
 */
export function isTextEntryElement(element: Element | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false
  if (element.isContentEditable) return true
  if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') return true
  if (element.tagName !== 'INPUT') return false
  const type = (element as HTMLInputElement).type || 'text'
  return !TEXT_ENTRY_IGNORED_INPUT_TYPES.has(type)
}

/**
 * Keep an observed update until this document reloads. The waiting worker
 * disappears as soon as it activates, and that transition is not a reason to
 * forget the update.
 *
 * @param current - Whether this document already knows a newer build is installed
 * @param ahead - Whether the registration currently shows a newer worker
 * @returns The flag to store until reload
 */
export function nextUpdateReady(current: boolean, ahead: boolean): boolean {
  return current || ahead
}

/**
 * True when this document is still running an older worker than the one installed.
 *
 * The service worker URL does not change between versions, so identity of the
 * worker objects is the signal. The first install has no controller yet and is
 * not an update.
 *
 * @param input.hasController - This document is controlled by a service worker
 * @param input.hasWaitingWorker - A newer worker is installed and waiting
 * @param input.activeIsController - The active worker is the one controlling this document
 * @returns Whether a newer build is downloaded and not yet showing
 */
export function installedWorkerIsAhead(input: {
  hasController: boolean
  hasWaitingWorker: boolean
  activeIsController: boolean
}): boolean {
  if (!input.hasController) return false
  if (input.hasWaitingWorker) return true
  return !input.activeIsController
}

/**
 * Reasons a ready update must wait. Empty when the document may reload.
 *
 * @param snapshot - Current game and focus state
 * @returns Blocking reasons, in a stable order
 */
export function pwaUpdateBlocks(snapshot: PwaUpdateSnapshot): PwaUpdateBlock[] {
  if (!snapshot.updateReady) return []
  const blocks: PwaUpdateBlock[] = []
  if (snapshot.gameInProgress) blocks.push('game')
  if (snapshot.viewingResults) blocks.push('results')
  if (snapshot.playAgainPending) blocks.push('play-again')
  if (snapshot.lobbyOpen) blocks.push('lobby')
  if (snapshot.interactionHold) blocks.push('interaction')
  if (snapshot.textEntryFocused) blocks.push('text-entry')
  return blocks
}

/**
 * Whether the waiting worker may activate and this document may reload.
 *
 * @param snapshot - Current game and focus state
 * @param options.ignoreTextEntry - An explicit Update click may proceed while a field is focused
 * @returns True when activation and reload are safe
 */
export function canApplyPwaUpdate(
  snapshot: PwaUpdateSnapshot,
  options?: { ignoreTextEntry?: boolean },
): boolean {
  const blocks = pwaUpdateBlocks(snapshot).filter((block) =>
    options?.ignoreTextEntry ? block !== 'text-entry' : true,
  )
  return snapshot.updateReady && blocks.length === 0
}

export type SkipWaitingWorker = {
  state: string
  postMessage: (data: { type: 'SKIP_WAITING' }) => void
  addEventListener: (type: 'statechange', listener: () => void) => void
  removeEventListener: (type: 'statechange', listener: () => void) => void
}

/**
 * Asks a waiting Workbox worker to activate. Sends only `{ type: 'SKIP_WAITING' }`.
 * Does not claim clients, delete caches, or touch localStorage / IndexedDB.
 *
 * @param waiting - The worker currently in the `waiting` state
 * @param options.timeoutMs - How long to wait for `activated` before giving up
 * @param options.schedule - Timer used for the timeout. Defaults to `setTimeout`
 * @returns True when the worker activated (or was already active). False on timeout
 */
export function activateWaitingWorker(
  waiting: SkipWaitingWorker,
  options?: {
    timeoutMs?: number
    schedule?: (ms: number, fn: () => void) => { cancel: () => void }
  },
): Promise<boolean> {
  if (waiting.state === 'activated' || waiting.state === 'redundant') {
    return Promise.resolve(true)
  }

  try {
    waiting.postMessage({ type: 'SKIP_WAITING' })
  } catch {
    return Promise.resolve(false)
  }

  const timeoutMs = options?.timeoutMs ?? PWA_ACTIVATION_TIMEOUT_MS
  const schedule =
    options?.schedule ??
    ((ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms)
      return { cancel: () => clearTimeout(id) }
    })

  return new Promise((resolve) => {
    let settled = false
    const finish = (activated: boolean) => {
      if (settled) return
      settled = true
      waiting.removeEventListener('statechange', onState)
      timer.cancel()
      resolve(activated)
    }
    const onState = () => {
      if (waiting.state === 'activated' || waiting.state === 'redundant') finish(true)
    }
    waiting.addEventListener('statechange', onState)
    const timer = schedule(timeoutMs, () => finish(false))
    onState()
  })
}

/**
 * Script URL and registration options for the generated Workbox worker.
 * `generateSW` serves the dev worker as a classic script even if the Nuxt
 * config asks for a module.
 *
 * @param dev - True in `nuxt dev`
 * @returns The script URL and `navigator.serviceWorker.register` options
 */
export function pwaServiceWorkerRegistration(dev: boolean): {
  scriptURL: string
  options: { scope: string; type: 'classic' }
} {
  if (dev) {
    return { scriptURL: '/dev-sw.js?dev-sw', options: { scope: '/', type: 'classic' } }
  }
  return { scriptURL: '/sw.js', options: { scope: '/', type: 'classic' } }
}

export type PwaUpdateClient = {
  /** Ask the browser to look for a new worker. Must not reload or clear storage. */
  checkForUpdate: () => Promise<void>
  /**
   * Activate a waiting worker, or report that another client already did.
   * Resolve true when this document should reload to pick up the new build.
   */
  activateWaitingWorker: () => Promise<boolean>
  /** Reload this document. Must not clear storage. */
  reload: () => void
}

export type PwaUpdateScheduler = {
  delay: (ms: number, fn: () => void) => { cancel: () => void }
  interval: (ms: number, fn: () => void) => { cancel: () => void }
}

/**
 * Applies a downloaded update after a short quiet period on a safe screen.
 * A game, match lobby, results view, or focused field cancels a pending reload.
 *
 * @param options.getSnapshot - Latest game and focus state
 * @param options.client - Service worker and reload side effects
 * @param options.schedule - Timers, injectable so tests do not wait on the clock
 * @param options.onChange - Banner state
 * @returns Controls for the Vue layer
 */
export function createPwaUpdateController(options: {
  getSnapshot: () => PwaUpdateSnapshot
  client: PwaUpdateClient
  schedule: PwaUpdateScheduler
  onChange?: (view: PwaUpdateView) => void
  applyDelayMs?: number
  checkIntervalMs?: number
}) {
  const applyDelayMs = options.applyDelayMs ?? PWA_UPDATE_APPLY_DELAY_MS
  const checkIntervalMs = options.checkIntervalMs ?? PWA_UPDATE_CHECK_INTERVAL_MS
  let pending: { cancel: () => void } | null = null
  let disposed = false
  let applying = false

  const publish = (view: PwaUpdateView) => {
    options.onChange?.(view)
  }

  const cancelPending = () => {
    pending?.cancel()
    pending = null
  }

  const sync = () => {
    if (disposed) return
    const snapshot = options.getSnapshot()
    const blocks = pwaUpdateBlocks(snapshot)
    if (!snapshot.updateReady) {
      cancelPending()
      publish({ notice: 'hidden', blocks: [] })
      return
    }
    if (!canApplyPwaUpdate(snapshot)) {
      cancelPending()
      publish({ notice: 'deferred', blocks })
      return
    }
    if (applying || pending) return
    publish({ notice: 'applying', blocks: [] })
    pending = options.schedule.delay(applyDelayMs, () => {
      pending = null
      void commit(false)
    })
  }

  const commit = async (ignoreTextEntry: boolean) => {
    if (disposed || applying) return
    const allowed = () => canApplyPwaUpdate(options.getSnapshot(), { ignoreTextEntry })
    if (!allowed()) {
      sync()
      return
    }

    applying = true
    publish({ notice: 'applying', blocks: [] })
    try {
      const shouldReload = await options.client.activateWaitingWorker()
      if (disposed) return
      if (!allowed()) {
        sync()
        return
      }
      if (shouldReload) {
        options.client.reload()
        return
      }
      // The worker did not activate. Leave a manual action instead of looping.
      publish({ notice: 'deferred', blocks: [] })
    } finally {
      applying = false
    }
  }

  const interval = options.schedule.interval(checkIntervalMs, () => {
    void options.client.checkForUpdate()
  })

  return {
    /** Re-read game state and arm or cancel the quiet-period reload. */
    sync,
    /** Look for a newly deployed worker. */
    check: () => options.client.checkForUpdate(),
    /**
     * Update immediately. Refuses while a game, lobby, or results screen is up.
     *
     * @returns Whether an activation was started
     */
    requestApply(): boolean {
      const snapshot = options.getSnapshot()
      const blocked = pwaUpdateBlocks(snapshot).some((block) => block !== 'text-entry')
      if (!snapshot.updateReady || blocked) return false
      cancelPending()
      void commit(true)
      return true
    },
    dispose() {
      disposed = true
      cancelPending()
      interval.cancel()
    },
  }
}
