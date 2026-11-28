import { createServer, type Server } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { connect } from 'node:net'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test as base, expect } from '@playwright/test'
import { generateSW } from 'workbox-build'
import { build } from 'esbuild'
import { assetWorker, workboxOptions } from '../build/pwa'
import { resolveAssetUrl } from '../app/utils/assetUrls'
import { PWA_UPDATE_APPLY_DELAY_MS } from '../app/utils/pwaUpdate'

const test = base.extend({
  // Chromium's context-level TLS exception does not cover worker-origin fetches.
  // This browser only talks to the disposable CONNECT proxy, never public hosts.
  launchOptions: async ({ browserName }, use) => {
    await use(browserName === 'chromium' ? { args: ['--ignore-certificate-errors'] } : {})
  },
})
const asset = 'https://assets.fudapop.com'
const legacy = 'https://ymoriyakbittfgocvxbw.supabase.co'
const raw = `${legacy}/storage/v1/object/public/static`
const render = `${legacy}/storage/v1/render/image/public/static`
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
  'base64',
)
// Two seconds of silent PCM works without a codec download or production data.
const wav = Buffer.alloc(44 + 16000 * 2)
wav.write('RIFF')
wav.writeUInt32LE(wav.length - 8, 4)
wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(8000, 24)
wav.writeUInt32LE(16000, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(wav.length - 44, 40)

let directory: string
let server: Server
let tls: ReturnType<typeof createHttpsServer>
let proxy: Server
let origin: string
let proxyUrl: string
let offline = false
let cors = true
let deployedVersion = 'v1'
const requests: { host: string; path: string; method: string; headers: Record<string, unknown> }[] =
  []

async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('fixture did not bind')
  return address.port
}

test.beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'hanafuda-r2-'))
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      join(directory, 'key.pem'),
      '-out',
      join(directory, 'cert.pem'),
      '-days',
      '1',
      '-subj',
      '/CN=assets.fudapop.com',
    ],
    { stdio: 'ignore' },
  )
  const updater = await build({
    entryPoints: [new URL('./pwa-update-client.ts', import.meta.url).pathname],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2022',
  })
  await writeFile(join(directory, 'updater.js'), updater.outputFiles[0]!.text)
  await writeFile(
    join(directory, 'index.html'),
    '<!doctype html><title>v1</title><p id="notice"></p>',
  )
  await writeFile(join(directory, assetWorker.fileName), assetWorker.source)
  await generateSW({
    ...workboxOptions,
    globDirectory: directory,
    swDest: join(directory, 'sw.js'),
  })
  server = createServer(async (req, res) => {
    const path = new URL(req.url!, 'http://fixture').pathname
    res.setHeader('Cache-Control', 'no-store')
    try {
      res.setHeader('Content-Type', path.endsWith('.js') ? 'application/javascript' : 'text/html')
      const root = deployedVersion === 'v2' ? join(directory, 'v2') : directory
      res.end(await readFile(join(root, path === '/' ? 'index.html' : path.slice(1))))
    } catch {
      res.writeHead(404).end()
    }
  })
  origin = `http://127.0.0.1:${await listen(server)}`
  tls = createHttpsServer(
    {
      key: await readFile(join(directory, 'key.pem')),
      cert: await readFile(join(directory, 'cert.pem')),
    },
    (req, res) => {
      requests.push({
        host: req.headers.host!,
        path: req.url!,
        method: req.method!,
        headers: { ...req.headers },
      })
      res.setHeader('Cache-Control', 'no-store')
      if (offline) {
        req.socket.destroy()
        return
      }
      if (req.headers.host !== 'assets.fudapop.com') {
        res.writeHead(503).end('Supabase unavailable')
        return
      }
      if (cors) {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges')
      }
      if (req.url === '/assets/redirect.png') {
        res
          .writeHead(302, {
            Location: `${legacy}/storage/v1/object/public/static/cards/private-original.png`,
          })
          .end()
        return
      }
      if (req.url!.includes('missing')) {
        res.writeHead(404).end()
        return
      }
      const audio = req.url!.includes('/audio/')
      const body = audio ? wav : pixel
      res.setHeader('Content-Type', audio ? 'audio/wav' : 'image/png')
      res.setHeader('Accept-Ranges', 'bytes')
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '')
      if (range) {
        const start = Number(range[1])
        const end = Math.min(Number(range[2] || body.length - 1), body.length - 1)
        res.setHeader('Content-Range', `bytes ${start}-${end}/${body.length}`)
        res.setHeader('Content-Length', end - start + 1)
        res.writeHead(206).end(req.method === 'HEAD' ? undefined : body.subarray(start, end + 1))
      } else {
        res.setHeader('Content-Length', body.length)
        res.end(req.method === 'HEAD' ? undefined : body)
      }
    },
  )
  const tlsPort = await listen(tls)
  // A real CONNECT proxy sees browser AND service-worker requests. No page.route().
  proxy = createServer((_req, res) => res.writeHead(502).end())
  proxy.on('connect', (_req, client, head) => {
    const upstream = connect(tlsPort, '127.0.0.1', () => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      upstream.write(head)
      client.pipe(upstream)
      upstream.pipe(client)
    })
    upstream.on('error', () => client.destroy())
    client.on('error', () => upstream.destroy())
  })
  proxyUrl = `http://127.0.0.1:${await listen(proxy)}`
})

test('step 4: the emitted worker waits for the real off-board monitor without losing local state', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  // A second generateSW build changes only the shell revision, like a deploy.
  const next = join(directory, 'v2')
  await mkdir(next)
  await writeFile(join(next, 'index.html'), '<!doctype html><title>v2</title><p id="notice"></p>')
  await writeFile(join(next, 'updater.js'), await readFile(join(directory, 'updater.js')))
  await writeFile(join(next, assetWorker.fileName), assetWorker.source)
  await generateSW({ ...workboxOptions, globDirectory: next, swDest: join(next, 'sw.js') })
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await page.goto(origin)
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    await page.addScriptTag({ type: 'module', url: '/updater.js' })
    await page.waitForFunction(() => typeof window.__setPwaScene === 'function')
    await page.evaluate(async () => {
      window.__setPwaScene?.({ gameInProgress: true })
      localStorage.setItem('preferences', 'moon')
      await (await caches.open('supabase-cache')).put('/saved', new Response('preserved'))
    })
    deployedVersion = 'v2'
    await expect(page.locator('#notice')).toHaveAttribute('data-pwa-update-state', 'deferred', {
      timeout: 15_000,
    })
    for (const scene of [
      { gameInProgress: true },
      { gameInProgress: false, lobbyOpen: true },
      { lobbyOpen: false, viewingResults: true },
    ]) {
      await page.evaluate((scene) => window.__setPwaScene?.(scene), scene)
      await page.waitForTimeout(PWA_UPDATE_APPLY_DELAY_MS + 200)
      await expect(page).toHaveTitle('v1')
      expect(
        await page.evaluate(
          async () => !!(await navigator.serviceWorker.getRegistration())?.waiting,
        ),
      ).toBe(true)
    }
    await page.evaluate(() => window.__setPwaScene?.({ viewingResults: false }))
    await expect(page).toHaveTitle('v2', { timeout: 15_000 })
    expect(
      await page.evaluate(async () => ({
        preferences: localStorage.getItem('preferences'),
        oldCache: await (await caches.open('supabase-cache'))
          .match('/saved')
          .then((r) => r?.text()),
      })),
    ).toEqual({ preferences: 'moon', oldCache: 'preserved' })
  } finally {
    deployedVersion = 'v1'
    await context.close()
  }
})

test.afterAll(async () => {
  for (const instance of [server, tls, proxy]) {
    instance?.closeAllConnections()
    instance?.close()
  }
  if (directory) await rm(directory, { recursive: true, force: true })
})

test('step 4: generated worker rewrites without Supabase, caches direct R2 and serves warmed offline ranges', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  requests.length = 0
  offline = false
  cors = true
  const context = await browser.newContext({
    proxy: { server: proxyUrl, bypass: '127.0.0.1' },
    ignoreHTTPSErrors: true,
  })
  try {
    await context.addCookies([
      { name: 'private', value: 'COOKIE_SECRET', url: asset },
      { name: 'private', value: 'COOKIE_SECRET', url: legacy },
    ])
    const page = await context.newPage()
    await page.goto(origin)
    // Fresh, uncontrolled requests already work directly against R2.
    expect(
      await page.evaluate(async (url) => {
        return {
          controlled: !!navigator.serviceWorker.controller,
          status: (await fetch(url)).status,
        }
      }, `${asset}/avatars/fresh.png`),
    ).toEqual({ controlled: false, status: 200 })
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const old = await caches.open('supabase-cache')
      await old.put('/old-save', new Response('keep'))
      localStorage.setItem('design', 'moon')
    })
    await page.reload()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    const response = await page.evaluate(async (url) => {
      const result = await fetch(url, {
        headers: { 'Authorization': 'Bearer SECRET', 'X-Secret': 'PRIVATE' },
        credentials: 'include',
      })
      return { status: result.status, size: (await result.arrayBuffer()).byteLength }
    }, `${raw}/avatars/legacy.png?v=obsolete`)
    expect(response).toEqual({ status: 200, size: pixel.length })
    expect(requests.filter((r) => r.host.includes('supabase'))).toEqual([])
    const destination = requests.find((r) => r.path === '/avatars/legacy.png')!
    expect(destination).toBeTruthy()
    expect(destination.headers).not.toHaveProperty('authorization')
    expect(destination.headers).not.toHaveProperty('x-secret')
    expect(destination.headers).not.toHaveProperty('cookie')
    expect(
      await page.evaluate(async (url) => {
        const r = await fetch(url, {
          credentials: 'include',
          headers: { 'Authorization': 'Bearer SECRET', 'X-Secret': 'PRIVATE' },
        })
        return r.status
      }, `${asset}/avatars/direct-secret.png`),
    ).toBe(200)
    expect(requests.at(-1)?.headers).not.toHaveProperty('authorization')
    expect(requests.at(-1)?.headers).not.toHaveProperty('x-secret')
    expect(requests.at(-1)?.headers).not.toHaveProperty('cookie')

    // Raw/render card compatibility uses the application's exact resolver.
    for (const url of [
      `${raw}/cards/post-card/back.png?v=old`,
      `${render}/cards/post-card/face.png?width=120&resize=contain`,
      `${raw}/assets/logo.png`,
      `${raw}/cards/nested/key/retained.png`,
    ]) {
      const mapped = resolveAssetUrl(url).url
      expect(await page.evaluate(async (url) => (await fetch(url)).status, url)).toBe(200)
      expect(requests.some((r) => `${asset}${r.path}` === mapped)).toBe(true)
    }
    const images = [
      `${asset}/avatars/direct.png`,
      `${raw}/avatars/image.png`,
      `${raw}/cards/post-card/css.png`,
    ]
    for (const url of images) {
      expect(
        await page.evaluate(
          (url) =>
            new Promise<boolean>((resolve) => {
              const image = new Image()
              image.onload = () => resolve(image.naturalWidth === 1)
              image.onerror = () => resolve(false)
              image.src = url
              document.body.append(image)
            }),
          url,
        ),
      ).toBe(true)
    }
    await page.evaluate((url) => {
      const div = document.createElement('div')
      div.style.cssText = `width:20px;height:20px;background-image:url("${url}")`
      document.body.append(div)
    }, `${raw}/avatars/css-background.png`)
    await expect
      .poll(() => requests.some((r) => r.path === '/avatars/css-background.png'))
      .toBe(true)

    // HEAD is not cached as an empty GET. Cold ranges never become complete files.
    const headUrl = `${raw}/avatars/head.png`
    expect(
      await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'HEAD' })
        return [r.status, (await r.arrayBuffer()).byteLength]
      }, headUrl),
    ).toEqual([200, 0])
    expect(
      await page.evaluate(
        async (url) => (await (await fetch(url)).arrayBuffer()).byteLength,
        headUrl,
      ),
    ).toBe(pixel.length)
    expect(requests.some((r) => r.path === '/avatars/head.png' && r.method === 'HEAD')).toBe(true)
    expect(
      await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'HEAD', headers: { Range: 'bytes=0-15' } })
        return [r.status, r.headers.get('content-range'), (await r.arrayBuffer()).byteLength]
      }, `${raw}/audio/head.wav`),
    ).toEqual([206, `bytes 0-15/${wav.length}`, 0])
    const audio = `${raw}/audio/bgm/test.wav`
    expect(
      await page.evaluate(async (url) => {
        const r = await fetch(url, { headers: { Range: 'bytes=0-31' } })
        return [r.status, r.headers.get('content-range'), (await r.arrayBuffer()).byteLength]
      }, audio),
    ).toEqual([206, `bytes 0-31/${wav.length}`, 32])
    expect(
      await page.evaluate(
        async (url) => (await (await fetch(url)).arrayBuffer()).byteLength,
        audio,
      ),
    ).toBe(wav.length)
    expect(
      requests.filter((r) => r.path === '/audio/bgm/test.wav').map((r) => r.headers.range),
    ).toEqual(['bytes=0-31', undefined])
    // Direct and legacy audio share one readable full-response cache entry.
    expect(
      await page.evaluate(async (url) => {
        const r = await fetch(url, { headers: { Range: 'bytes=-16' } })
        return [r.status, r.headers.get('content-range'), (await r.arrayBuffer()).byteLength]
      }, `${asset}/audio/bgm/test.wav`),
    ).toEqual([206, `bytes ${wav.length - 16}-${wav.length - 1}/${wav.length}`, 16])
    for (const url of [audio, `${asset}/audio/bgm/test.wav`]) {
      expect(
        await page.evaluate(
          (url) =>
            new Promise<boolean>((resolve) => {
              const audio = new Audio(url)
              audio.muted = true
              audio.onloadedmetadata = () => {
                audio.currentTime = 0.5
              }
              audio.onseeked = () => {
                void audio.play().then(
                  () => {
                    audio.pause()
                    resolve(true)
                  },
                  () => resolve(false),
                )
              }
              audio.onerror = () => resolve(false)
            }),
          url,
        ),
      ).toBe(true)
    }

    // A missing R2 object must stay missing, with no source/original fallback.
    expect(
      await page.evaluate(async (url) => (await fetch(url)).status, `${raw}/avatars/missing.png`),
    ).toBe(404)
    expect(requests.filter((r) => r.host.includes('supabase'))).toEqual([])
    const beforeOffline = requests.length
    offline = true
    expect(
      await page.evaluate(async (url) => {
        const r = await fetch(url, { headers: { Range: 'bytes=100-199' } })
        return [r.status, r.headers.get('content-range'), (await r.arrayBuffer()).byteLength]
      }, audio),
    ).toEqual([206, `bytes 100-199/${wav.length}`, 100])
    expect(
      await page.evaluate(async (url) => {
        const r = await fetch(url, { headers: { Range: 'bytes=999999-' } })
        return r.status
      }, audio),
    ).toBe(416)
    for (const [range, expected] of [
      ['bytes=100-999999', [206, wav.length - 100]],
      ['bytes=-999999', [206, wav.length]],
      ['bytes=200-100', [416, 0]],
      ['bytes=-0', [416, 0]],
      ['bytes=0-1,3-4', [416, 0]],
    ] as const) {
      expect(
        await page.evaluate(
          async ([url, range]) => {
            const r = await fetch(url, { headers: { Range: range } })
            return [r.status, (await r.arrayBuffer()).byteLength]
          },
          [audio, range],
        ),
      ).toEqual(expected)
    }
    expect(
      await page.evaluate(
        (url) =>
          new Promise<boolean>((resolve) => {
            const audio = new Audio(url)
            audio.muted = true
            audio.preload = 'auto'
            audio.onloadedmetadata = () => {
              audio.currentTime = 1
            }
            audio.onseeked = () => {
              void audio.play().then(
                () => {
                  audio.pause()
                  resolve(true)
                },
                () => resolve(false),
              )
            }
            audio.onerror = () => resolve(false)
          }),
        audio,
      ),
    ).toBe(true)
    expect(
      await page.evaluate(
        async (url) => (await (await fetch(url)).arrayBuffer()).byteLength,
        `${asset}/avatars/legacy.png`,
      ),
    ).toBe(pixel.length)
    expect(
      await page.evaluate(async () => ({
        old: await (await caches.open('supabase-cache')).match('/old-save').then((r) => r?.text()),
        design: localStorage.getItem('design'),
        names: await caches.keys(),
      })),
    ).toMatchObject({
      old: 'keep',
      design: 'moon',
      names: expect.arrayContaining(['r2-cards-v1', 'r2-public-v1']),
    })
    expect(requests.length).toBe(beforeOffline)
    // HEAD and cold ranges remain network-only offline, never fake full files.
    for (const [url, init] of [
      [headUrl, { method: 'HEAD' }],
      [`${asset}/audio/cold.wav`, { headers: { Range: 'bytes=0-31' } }],
    ] as const) {
      expect(
        await page.evaluate(
          async ([url, init]) => {
            try {
              await fetch(url, init)
              return 'unexpected success'
            } catch {
              return 'offline'
            }
          },
          [url, init] as const,
        ),
      ).toBe('offline')
    }
  } finally {
    offline = false
    await context.close()
  }
})

test('step 4: exact contract isolation, redirect refusal, CORS prerequisite and bounded caches', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  requests.length = 0
  offline = false
  cors = true
  const context = await browser.newContext({
    proxy: { server: proxyUrl, bypass: '127.0.0.1' },
    ignoreHTTPSErrors: true,
  })
  try {
    const page = await context.newPage()
    await page.goto(origin)
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    const unrecognized = [
      `${legacy}/rest/v1/avatars`,
      `${legacy}/auth/v1/token`,
      `${legacy}/realtime/v1/websocket`,
      `${legacy}/storage/v1/object/authenticated/static/avatars/no.png`,
      `${legacy}/storage/v1/object/sign/static/avatars/no.png?token=SECRET`,
      `${legacy}/storage/v1/object/public/private/avatars/no.png`,
      `${legacy}:444/storage/v1/object/public/static/avatars/no.png`,
      `${legacy}./storage/v1/object/public/static/avatars/no.png`,
      `${raw}/avatars/no.png?%74oken=SECRET`,
      `${raw}/avatars/no.png?X-Amz-Signature=SECRET`,
      `${raw}/unknown/no.png`,
      `${raw}/avatars/a%2fb.png`,
      `${raw}/avatars/%2e%2e%2fprivate.png`,
      `${render}/cards/design/no.png?width=240&resize=contain`,
      `${render}/avatars/no.png?width=120&resize=contain`,
      'https://other.supabase.co/storage/v1/object/public/static/avatars/no.png',
      'https://ymoriyakbittfgocvxbw.supabase.co.evil.test/storage/v1/object/public/static/avatars/no.png',
      'https://assets.fudapop.com.evil.test/avatars/no.png',
    ]
    for (const url of unrecognized) {
      expect(resolveAssetUrl(url)).toEqual({ url, recognized: false })
      await page.evaluate(async (url) => {
        try {
          await fetch(url)
        } catch {
          /* expected CORS isolation */
        }
      }, url)
    }
    expect(requests.filter((r) => r.host === 'assets.fudapop.com')).toEqual([])
    expect(requests.length).toBe(unrecognized.length)
    // Browsers reject credential-bearing fetch URLs before the worker sees them.
    await page.evaluate(
      async (url) => {
        try {
          await fetch(url)
        } catch {
          /* expected */
        }
      },
      `${legacy.replace('https://', 'https://user:SECRET@')}/storage/v1/object/public/static/avatars/no.png`,
    )
    expect(requests.length).toBe(unrecognized.length)
    // Unsupported methods are not rewritten either.
    await page.evaluate(async (url) => {
      try {
        await fetch(url, { method: 'POST' })
      } catch {
        /* expected */
      }
    }, `${raw}/avatars/post.png`)
    expect(requests.at(-1)).toMatchObject({ host: new URL(legacy).host, method: 'POST' })
    // Only the public revision/namespaces are cached, not arbitrary R2 objects.
    const unsupported = [
      `${asset}/cards/original/design/face.png`,
      `${asset}/cards/v2/design/face.png`,
      `${asset}/fudapop-private/cards/design/face.png`,
      `${asset}/avatars/uncached.png?v=unknown`,
    ]
    for (const url of unsupported) {
      expect(await page.evaluate(async (url) => (await fetch(url)).status, url)).toBe(200)
    }
    expect(
      await page.evaluate(async () =>
        (await (await caches.open('r2-public-v1')).keys()).map((r) => r.url),
      ),
    ).toEqual([])

    cors = false
    expect(
      await page.evaluate(async (url) => {
        try {
          await fetch(url)
          return 'unexpected success'
        } catch {
          return 'CORS blocked'
        }
      }, `${raw}/audio/no-cors.wav`),
    ).toBe('CORS blocked')
    expect(requests.at(-1)).toMatchObject({
      host: 'assets.fudapop.com',
      path: '/audio/no-cors.wav',
    })
    expect(
      await page.evaluate(async () => {
        const cache = await caches.open('r2-public-v1')
        return !!(await cache.match('https://assets.fudapop.com/audio/no-cors.wav'))
      }),
    ).toBe(false)
    cors = true
    // An upstream redirect must never fetch even a public-looking original.
    expect(
      await page.evaluate(async (url) => {
        try {
          await fetch(url)
          return 'unexpected success'
        } catch {
          return 'redirect refused'
        }
      }, `${raw}/assets/redirect.png`),
    ).toBe('redirect refused')
    expect(requests.some((r) => r.path.includes('private-original'))).toBe(false)
    const beforeInvalidRange = requests.length
    expect(
      await page.evaluate(
        async (url) =>
          (
            await fetch(url, {
              headers: { Range: 'SECRET arbitrary text' },
            })
          ).status,
        `${raw}/audio/invalid.wav`,
      ),
    ).toBe(416)
    expect(requests.length).toBe(beforeInvalidRange)
    await page.evaluate(async (asset) => {
      for (let i = 0; i < 132; i++) {
        const response = await fetch(`${asset}/avatars/bound-${i}.png`)
        await response.arrayBuffer()
      }
    }, asset)
    await expect
      .poll(async () =>
        page.evaluate(async () => (await (await caches.open('r2-public-v1')).keys()).length),
      )
      .toBe(128)
    expect(
      requests
        .filter((r) => r.host === 'assets.fudapop.com')
        .every((r) => !r.headers.authorization && !r.headers.cookie && !r.path.includes('SECRET')),
    ).toBe(true)
  } finally {
    cors = true
    await context.close()
  }
})
