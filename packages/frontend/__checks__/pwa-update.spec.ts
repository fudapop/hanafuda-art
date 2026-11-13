import { createServer, type Server } from 'node:http'
import { expect, test, type Page } from '@playwright/test'
import { canApplyPwaUpdate, type PwaUpdateSnapshot } from '../app/utils/pwaUpdate'

/**
 * An already-controlled client must keep showing the installed build while a
 * game is in progress, then pick up the next build after SKIP_WAITING and a
 * reload. localStorage and IndexedDB survive that reload.
 *
 * Chromium only. Run from packages/frontend:
 *   pnpm exec playwright test __checks__/pwa-update.spec.ts --project=chromium
 */
test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only')

let version = 'v1'
let server: Server
let origin = ''

function pageHtml(current: string) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>${current}</title></head>
  <body>
    <h1 id="version">${current}</h1>
    <script>
      if (!localStorage.getItem('hanafuda-test-coins')) {
        localStorage.setItem('hanafuda-test-coins', '40')
      }
      if (!localStorage.getItem('hanafuda-test-design')) {
        localStorage.setItem('hanafuda-test-design', 'moon')
      }
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
    </script>
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
  version = 'v1'
  server = createServer((req, res) => {
    const path = (req.url || '/').split('?')[0]
    res.setHeader('Cache-Control', 'no-cache')
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
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
}

test('an installed client picks up the next build without clearing local data', async ({
  page,
}) => {
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

  version = 'v2'
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) throw new Error('missing registration')
    await registration.update()
    if (registration.waiting) return
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('timed out waiting for the next worker')),
        20_000,
      )
      const watch = (worker: ServiceWorker | null) => {
        if (!worker) return
        if (worker.state === 'installed' || worker.state === 'activated') {
          clearTimeout(timer)
          resolve()
          return
        }
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' || worker.state === 'activated') {
            clearTimeout(timer)
            resolve()
          }
        })
      }
      watch(registration.installing)
      registration.addEventListener('updatefound', () => watch(registration.installing))
    })
  })

  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    return registration?.waiting != null
  })

  // A waiting worker must not replace a match that is still on screen.
  expect(canApplyPwaUpdate(inGame)).toBe(false)
  await expect(page.locator('#version')).toHaveText('v1')

  expect(canApplyPwaUpdate({ ...inGame, gameInProgress: false })).toBe(true)
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    const waiting = registration?.waiting
    if (!waiting) throw new Error('expected a waiting worker')
    waiting.postMessage({ type: 'SKIP_WAITING' })
    await new Promise<void>((resolve) => {
      if (waiting.state === 'activated' || waiting.state === 'redundant') {
        resolve()
        return
      }
      waiting.addEventListener('statechange', () => {
        if (waiting.state === 'activated' || waiting.state === 'redundant') resolve()
      })
    })
  })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('#version')).toHaveText('v2')

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
