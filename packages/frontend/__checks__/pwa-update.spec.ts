import { createServer, type Server } from 'node:http'
import { expect, test, type Page } from '@playwright/test'
import { build } from 'esbuild'
import {
  canApplyPwaUpdate,
  PWA_UPDATE_APPLY_DELAY_MS,
  type PwaUpdateSnapshot,
} from '../app/utils/pwaUpdate'

/**
 * An already-controlled client runs the real update monitor. While a game is
 * in progress the monitor must not reload. After the game flag clears, the
 * monitor itself activates the waiting worker and reloads onto the new build.
 * The test does not post SKIP_WAITING or call reload for that update.
 *
 * Chromium only. Run from packages/frontend:
 *   pnpm exec playwright test __checks__/pwa-update.spec.ts --project=chromium
 */
test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only')

let version = 'v1'
let server: Server
let origin = ''
let updaterSource = ''

function pageHtml(current: string) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>${current}</title></head>
  <body>
    <h1 id="version">${current}</h1>
    <p id="notice" data-pwa-update-state="hidden"></p>
    <script type="module" src="/updater.js"></script>
  </body>
</html>`
}

function workerScript(current: string) {
  return `
const VERSION = ${JSON.stringify(current)}
self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch('/shell', { cache: 'no-store' })
      .then((response) => response.arrayBuffer())
      .then((body) => caches.open('app-' + VERSION).then((cache) =>
        cache.put('/shell', new Response(body, { headers: { 'Content-Type': 'text/html' } })),
      ))
  )
})
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.pathname === '/updater.js' || url.pathname === '/sw.js') return
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    caches.open('app-' + VERSION)
      .then((cache) => cache.match('/shell'))
      .then((cached) => cached || fetch(event.request))
  )
})
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
`
}

test.beforeAll(async () => {
  const bundled = await build({
    entryPoints: [new URL('./pwa-update-client.ts', import.meta.url).pathname],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    write: false,
  })
  updaterSource = bundled.outputFiles[0]?.text ?? ''
  if (!updaterSource.includes('SKIP_WAITING')) {
    throw new Error('bundled updater does not activate the waiting worker')
  }

  version = 'v1'
  server = createServer((req, res) => {
    const path = (req.url || '/').split('?')[0]
    res.setHeader('Cache-Control', 'no-cache')
    if (path === '/updater.js') {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
      res.end(updaterSource)
      return
    }
    if (path === '/sw.js') {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.end(workerScript(version))
      return
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(pageHtml(version))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('server did not bind')
  origin = `http://127.0.0.1:${address.port}`
})

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
})

const inGame: PwaUpdateSnapshot = {
  updateReady: true,
  gameInProgress: true,
  viewingResults: false,
  playAgainPending: false,
  lobbyOpen: false,
  interactionHold: false,
  textEntryFocused: false,
}

async function installAndControl(page: Page) {
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.__setPwaScene === 'function')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // The first reload only lets the installed worker control the page.
  // The update under test must reload on its own after this.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await page.waitForFunction(() => typeof window.__setPwaScene === 'function')
}

async function setGameInProgress(page: Page, gameInProgress: boolean) {
  await page.evaluate((inProgress) => {
    window.__setPwaScene?.({ gameInProgress: inProgress })
  }, gameInProgress)
}

test('the updater reloads a safe screen and waits through an active game', async ({ page }) => {
  test.setTimeout(60_000)
  version = 'v1'
  await installAndControl(page)
  await expect(page.locator('#version')).toHaveText('v1')

  await page.evaluate(async () => {
    localStorage.setItem('hanafuda-test-coins', '40')
    localStorage.setItem('hanafuda-test-design', 'moon')
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('hanafuda-test', 1)
      open.onupgradeneeded = () => {
        open.result.createObjectStore('saves')
      }
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('saves', 'readwrite')
        tx.objectStore('saves').put({ coins: 40, design: 'moon' }, 'guest')
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
      open.onerror = () => reject(open.error)
    })
  })

  expect(canApplyPwaUpdate(inGame)).toBe(false)
  await setGameInProgress(page, true)
  version = 'v2'

  await expect(page.locator('#notice')).toHaveAttribute('data-pwa-update-state', 'deferred', {
    timeout: 15_000,
  })
  await page.waitForTimeout(PWA_UPDATE_APPLY_DELAY_MS + 500)
  await expect(page.locator('#version')).toHaveText('v1')
  await expect(page.locator('#notice')).toHaveAttribute('data-pwa-update-state', 'deferred')

  await setGameInProgress(page, false)
  await expect(page.locator('#version')).toHaveText('v2', { timeout: 15_000 })

  const stored = await page.evaluate(async () => {
    const record = await new Promise<{ coins: number; design: string } | undefined>(
      (resolve, reject) => {
        const open = indexedDB.open('hanafuda-test', 1)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('saves', 'readonly')
          const request = tx.objectStore('saves').get('guest')
          request.onsuccess = () => {
            db.close()
            resolve(request.result)
          }
          request.onerror = () => reject(request.error)
        }
        open.onerror = () => reject(open.error)
      },
    )
    return {
      coins: localStorage.getItem('hanafuda-test-coins'),
      design: localStorage.getItem('hanafuda-test-design'),
      record,
    }
  })
  expect(stored).toEqual({
    coins: '40',
    design: 'moon',
    record: { coins: 40, design: 'moon' },
  })
})
