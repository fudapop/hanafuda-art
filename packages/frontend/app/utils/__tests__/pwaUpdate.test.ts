import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PWA_UPDATE_APPLY_DELAY_MS,
  PWA_UPDATE_CHECK_INTERVAL_MS,
  activateWaitingWorker,
  canApplyPwaUpdate,
  createPwaUpdateController,
  installedWorkerIsAhead,
  isTextEntryElement,
  pwaServiceWorkerRegistration,
  pwaUpdateBlocks,
  type PwaUpdateBlock,
  type PwaUpdateClient,
  type PwaUpdateNotice,
  type PwaUpdateSnapshot,
  type SkipWaitingWorker,
} from '../pwaUpdate'

const safe = (overrides: Partial<PwaUpdateSnapshot> = {}): PwaUpdateSnapshot => ({
  updateReady: true,
  gameInProgress: false,
  viewingResults: false,
  playAgainPending: false,
  lobbyOpen: false,
  interactionHold: false,
  textEntryFocused: false,
  ...overrides,
})

describe('installedWorkerIsAhead', () => {
  it('ignores the first install, before any worker controls the page', () => {
    expect(
      installedWorkerIsAhead({
        hasController: false,
        hasWaitingWorker: true,
        activeIsController: false,
      }),
    ).toBe(false)
  })

  it('is ready when a controlled page has a waiting worker', () => {
    expect(
      installedWorkerIsAhead({
        hasController: true,
        hasWaitingWorker: true,
        activeIsController: true,
      }),
    ).toBe(true)
  })

  it('is ready when another tab already activated a newer worker', () => {
    expect(
      installedWorkerIsAhead({
        hasController: true,
        hasWaitingWorker: false,
        activeIsController: false,
      }),
    ).toBe(true)
  })

  it('is idle when the active worker is the one running this document', () => {
    expect(
      installedWorkerIsAhead({
        hasController: true,
        hasWaitingWorker: false,
        activeIsController: true,
      }),
    ).toBe(false)
  })
})

describe('nextUpdateReady', () => {
  it('stays ready after the waiting worker activates and the slot clears', () => {
    expect(nextUpdateReady(true, false)).toBe(true)
    expect(nextUpdateReady(false, true)).toBe(true)
    expect(nextUpdateReady(false, false)).toBe(false)
  })
})

describe('canApplyPwaUpdate', () => {
  it('applies only when an update is ready and nothing is in progress', () => {
    expect(canApplyPwaUpdate(safe())).toBe(true)
    expect(canApplyPwaUpdate(safe({ updateReady: false }))).toBe(false)
  })

  it.each<[PwaUpdateBlock, Partial<PwaUpdateSnapshot>]>([
    ['game', { gameInProgress: true }],
    ['results', { viewingResults: true }],
    ['play-again', { playAgainPending: true }],
    ['lobby', { lobbyOpen: true }],
    ['interaction', { interactionHold: true }],
    ['text-entry', { textEntryFocused: true }],
  ])('waits on %s', (block, override) => {
    expect(pwaUpdateBlocks(safe(override))).toContain(block)
    expect(canApplyPwaUpdate(safe(override))).toBe(false)
  })

  it('lets an explicit update proceed while a field is focused, and still refuses a game', () => {
    expect(canApplyPwaUpdate(safe({ textEntryFocused: true }), { ignoreTextEntry: true })).toBe(
      true,
    )
    expect(
      canApplyPwaUpdate(safe({ textEntryFocused: true, gameInProgress: true }), {
        ignoreTextEntry: true,
      }),
    ).toBe(false)
  })
})

describe('isTextEntryElement', () => {
  it('treats text fields as typing and buttons as not', () => {
    const text = document.createElement('input')
    text.type = 'text'
    const password = document.createElement('input')
    password.type = 'password'
    const button = document.createElement('input')
    button.type = 'button'
    const area = document.createElement('textarea')
    const div = document.createElement('div')

    expect(isTextEntryElement(text)).toBe(true)
    expect(isTextEntryElement(password)).toBe(true)
    expect(isTextEntryElement(area)).toBe(true)
    expect(isTextEntryElement(button)).toBe(false)
    expect(isTextEntryElement(div)).toBe(false)
    expect(isTextEntryElement(null)).toBe(false)
  })
})

describe('activateWaitingWorker', () => {
  function fakeWorker(state: string) {
    const listeners = new Set<() => void>()
    const messages: Array<{ type: string }> = []
    const worker: SkipWaitingWorker = {
      state,
      postMessage(data) {
        messages.push(data)
      },
      addEventListener(_type, listener) {
        listeners.add(listener)
      },
      removeEventListener(_type, listener) {
        listeners.delete(listener)
      },
    }
    return {
      worker,
      messages,
      setState(next: string) {
        worker.state = next
        for (const listener of listeners) listener()
      },
    }
  }

  it('posts only SKIP_WAITING and resolves once the worker activates', async () => {
    const fake = fakeWorker('installed')
    const pending = activateWaitingWorker(fake.worker, {
      schedule: () => ({ cancel() {} }),
    })
    expect(fake.messages).toEqual([{ type: 'SKIP_WAITING' }])
    fake.setState('activated')
    await expect(pending).resolves.toBe(true)
  })

  it('does not post again when the worker is already active', async () => {
    const fake = fakeWorker('activated')
    await expect(activateWaitingWorker(fake.worker)).resolves.toBe(true)
    expect(fake.messages).toEqual([])
  })

  it('gives up on timeout without resolving as a reload', async () => {
    const fake = fakeWorker('installed')
    let fire: (() => void) | undefined
    const pending = activateWaitingWorker(fake.worker, {
      schedule(_ms, fn) {
        fire = fn
        return { cancel() {} }
      },
    })
    fire?.()
    await expect(pending).resolves.toBe(false)
    expect(fake.messages).toEqual([{ type: 'SKIP_WAITING' }])
  })
})

describe('createPwaUpdateController', () => {
  function harness(
    initial: PwaUpdateSnapshot,
    activate: () => Promise<boolean> = async () => true,
  ) {
    let snapshot = initial
    const calls: string[] = []
    const storage = new Map<string, string>([
      ['hanafuda-coins', '40'],
      ['hanafuda-design', 'moon'],
    ])
    const delays: Array<{ fn: () => void; cancelled: boolean }> = []
    let notice: PwaUpdateNotice = 'hidden'
    const client: PwaUpdateClient = {
      async checkForUpdate() {
        calls.push('check')
      },
      activateWaitingWorker: async () => {
        calls.push('activate')
        return activate()
      },
      reload() {
        calls.push('reload')
      },
    }
    const controller = createPwaUpdateController({
      getSnapshot: () => snapshot,
      client,
      schedule: {
        delay(_ms, fn) {
          const entry = { fn, cancelled: false }
          delays.push(entry)
          return {
            cancel() {
              entry.cancelled = true
            },
          }
        },
        interval() {
          return { cancel() {} }
        },
      },
      onChange(view) {
        notice = view.notice
      },
    })
    return {
      controller,
      calls,
      storage,
      get notice() {
        return notice
      },
      set(next: Partial<PwaUpdateSnapshot>) {
        snapshot = { ...snapshot, ...next }
      },
      async fireDelay() {
        const entry = [...delays].reverse().find((item) => !item.cancelled)
        if (!entry) throw new Error('no pending update')
        entry.fn()
        for (let i = 0; i < 8; i++) await Promise.resolve()
      },
    }
  }

  it('reloads a safe screen after the quiet period and leaves saved data alone', async () => {
    const update = harness(safe())
    update.controller.sync()
    expect(update.notice).toBe('applying')
    expect(update.calls).toEqual([])
    await update.fireDelay()
    expect(update.calls).toEqual(['activate', 'reload'])
    expect(update.storage.get('hanafuda-coins')).toBe('40')
    expect(update.storage.get('hanafuda-design')).toBe('moon')
    expect(PWA_UPDATE_APPLY_DELAY_MS).toBeGreaterThanOrEqual(1_000)
    expect(PWA_UPDATE_CHECK_INTERVAL_MS).toBeLessThanOrEqual(60 * 60 * 1000)
  })

  it('does not activate or reload during a game, then does once the menu is back', async () => {
    const update = harness(safe({ gameInProgress: true }))
    update.controller.sync()
    expect(update.notice).toBe('deferred')
    expect(update.controller.requestApply()).toBe(false)
    expect(update.calls).toEqual([])

    update.set({ gameInProgress: false })
    update.controller.sync()
    expect(update.notice).toBe('applying')
    await update.fireDelay()
    expect(update.calls).toEqual(['activate', 'reload'])
  })

  it.each(['lobbyOpen', 'viewingResults', 'playAgainPending', 'interactionHold'] as const)(
    'holds the update while %s is set',
    (flag) => {
      const update = harness(safe({ [flag]: true }))
      update.controller.sync()
      expect(update.notice).toBe('deferred')
      expect(update.calls).toEqual([])
    },
  )

  it('cancels a pending reload when a game starts during the quiet period', async () => {
    const update = harness(safe())
    update.controller.sync()
    update.set({ gameInProgress: true })
    update.controller.sync()
    expect(update.notice).toBe('deferred')
    await expect(update.fireDelay()).rejects.toThrow(/no pending update/)
    expect(update.calls).toEqual([])
  })

  it('does not reload if a match starts while the worker is activating', async () => {
    let duringActivation: (() => void) | undefined
    const update = harness(safe(), async () => {
      duringActivation?.()
      return true
    })
    duringActivation = () => update.set({ gameInProgress: true })
    update.controller.sync()
    await update.fireDelay()
    expect(update.calls).toEqual(['activate'])
    expect(update.notice).toBe('deferred')
  })

  it('updates immediately from a focused field, and not from a game', async () => {
    const typing = harness(safe({ textEntryFocused: true }))
    typing.controller.sync()
    expect(typing.notice).toBe('deferred')
    expect(typing.controller.requestApply()).toBe(true)
    for (let i = 0; i < 8; i++) await Promise.resolve()
    expect(typing.calls).toEqual(['activate', 'reload'])

    const playing = harness(safe({ gameInProgress: true }))
    expect(playing.controller.requestApply()).toBe(false)
    expect(playing.calls).toEqual([])
  })

  it('does not reload when the worker fails to activate', async () => {
    const update = harness(safe(), async () => false)
    update.controller.sync()
    await update.fireDelay()
    expect(update.calls).toEqual(['activate'])
    expect(update.notice).toBe('deferred')
  })
})

describe('service worker registration target', () => {
  it('uses the production worker and the classic dev worker', () => {
    expect(pwaServiceWorkerRegistration(false)).toEqual({
      scriptURL: '/sw.js',
      options: { scope: '/', type: 'classic' },
    })
    expect(pwaServiceWorkerRegistration(true).scriptURL).toBe('/dev-sw.js?dev-sw')
  })
})

describe('update flow does not clear local data', () => {
  it('never clears storage or cache buckets from the update code', () => {
    const sources = [
      'app/utils/pwaUpdate.ts',
      'app/composables/useAppUpdate.ts',
      'app/composables/usePwaUpdateGate.ts',
      'app/plugins/pwa-update.client.ts',
      'app/components/PwaUpdateBanner.vue',
      '__checks__/pwa-update-client.ts',
    ].map((file) => readFileSync(resolve(file), 'utf8'))

    for (const source of sources) {
      expect(source).not.toMatch(/localStorage\.clear/)
      expect(source).not.toMatch(/sessionStorage\.clear/)
      expect(source).not.toMatch(/indexedDB\.deleteDatabase/)
      expect(source).not.toMatch(/caches\.delete/)
    }
  })
})

describe('Cloudflare Pages cache headers', () => {
  const headers = readFileSync(resolve('public/_headers'), 'utf8')

  function cacheControl(path: string) {
    let value: string | undefined
    let pattern: string | undefined
    for (const raw of headers.split('\n')) {
      if (!raw.trim() || raw.trim().startsWith('#')) continue
      if (!/^\s/.test(raw)) {
        pattern = raw.trim()
        continue
      }
      const match = raw.trim().match(/^cache-control:\s*(.+)$/i)
      if (!pattern || !match) continue
      const regex = new RegExp(
        `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
      )
      if (regex.test(path)) value = match[1]
    }
    return value
  }

  it('revalidates the worker and the HTML shell', () => {
    for (const path of ['/sw.js', '/', '/index.html', '/manifest.webmanifest', '/ja/index.html']) {
      const value = cacheControl(path)
      expect(value, path).toBeDefined()
      expect(value).toContain('no-cache')
      expect(value).not.toContain('immutable')
    }
  })

  it('keeps hashed build assets cached', () => {
    expect(cacheControl('/_nuxt/entry.abc123.js')).toContain('immutable')
  })
})

describe('pwa config stays on prompt mode', () => {
  const config = readFileSync(resolve('nuxt.config.ts'), 'utf8')

  it('does not auto-reload and does not let a waiting worker claim open tabs', () => {
    expect(config).toMatch(/registerType:\s*'prompt'/)
    expect(config).toMatch(/registerPlugin:\s*false/)
    expect(config).toMatch(/skipWaiting:\s*false/)
    expect(config).toMatch(/clientsClaim:\s*false/)
    expect(config).not.toMatch(/registerType:\s*'autoUpdate'/)
  })
})
