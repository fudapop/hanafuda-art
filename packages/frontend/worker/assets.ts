/// <reference lib="webworker" />
import { CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { ASSET_ORIGIN, CARD_ASSET_REVISION, resolveAssetUrl } from '../app/utils/assetUrls'

const worker = globalThis as unknown as ServiceWorkerGlobalScope
const year = 365 * 24 * 60 * 60
const strategies = new Map<string, CacheFirst>()

worker.addEventListener('fetch', (event) => {
  const request = event.request
  if (!['GET', 'HEAD'].includes(request.method) || request.mode === 'same-origin') return
  // Legacy recognition is the same bundled function used by the application.
  const mapped = resolveAssetUrl(request.url)
  const url = mapped.url
  // Direct URLs also need namespace/key boundaries; no arbitrary R2 paths or
  // queries (including signed URLs) belong in the public runtime cache.
  const path = url.startsWith(`${ASSET_ORIGIN}/`) ? url.slice(ASSET_ORIGIN.length + 1) : ''
  if (
    !mapped.recognized &&
    (!path.split('/').every((part) => /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part)) ||
      !new RegExp(`^(cards/${CARD_ASSET_REVISION}/[^/]+/[^/]+|(?:avatars|audio|assets)/.+)$`).test(
        path,
      ))
  )
    return

  event.respondWith(serve(event, url, path))
})

/**
 * Keep rewritten requests inside a bounded canonical cache, not the old cache.
 * @param event - Original fetch event, including its lifetime.
 * @param url - Validated public destination.
 * @param path - Public object path used to select the cache.
 * @returns A compatible response, including network HEAD/cold range responses.
 * @throws When R2 is unavailable, redirects, or fails CORS. No source fallback.
 */
async function serve(event: FetchEvent, url: string, path: string): Promise<Response> {
  const incoming = event.request
  const headers = new Headers()
  // Do not clone the source Request: it may carry credentials, auth, tracking,
  // or obsolete transform headers. Range is the only forwarded request header.
  const range = incoming.headers.get('range')
  if (range) {
    // Multipart/invalid ranges are unsupported, not arbitrary forwarded text.
    if (!/^bytes=(?:\d+-\d*|-\d+)$/i.test(range)) return new Response(null, { status: 416 })
    headers.set('Range', range)
  }
  const request = new Request(url, {
    method: incoming.method,
    // A readable CORS response is valid for both cors fetches and no-cors
    // image/audio consumers. Never manufacture readable bytes from opaque data.
    // Public R2 must allow the application's Origin before this can roll out.
    mode: 'cors',
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    headers,
  })
  // HEAD is network-only: never store its empty body as a complete GET.
  if (incoming.method === 'HEAD') return fetch(request)

  const card = path.startsWith(`cards/${CARD_ASSET_REVISION}/`)
  const cacheName = card ? `r2-cards-${CARD_ASSET_REVISION}` : 'r2-public-v1'
  let strategy = strategies.get(cacheName)
  if (!strategy) {
    strategy = new CacheFirst({
      cacheName,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({ maxEntries: card ? 1000 : 128, maxAgeSeconds: year }),
        {
          cachedResponseWillBeUsed: async ({ request, cachedResponse }) =>
            cachedResponse && request.headers.has('range')
              ? partialResponse(request, cachedResponse)
              : cachedResponse,
        },
      ],
    })
    strategies.set(cacheName, strategy)
  }
  // Internal fetches do not re-enter Workbox routing. The canonical request is
  // passed to the strategy explicitly so old and direct URLs share cache keys.
  return strategy.handle({ event, request })
}

// Workbox 7.4's range plugin does not reject starts beyond EOF or clamp large
// ends/suffixes. These boundaries matter when an audio element seeks offline.
/**
 * Slice only readable complete cached bodies. Multiple/invalid ranges get 416.
 * @param request - Request with a Range header.
 * @param response - Complete cached public response.
 * @returns A single 206 range, or 416 with the complete resource length.
 * @throws If the cached body cannot be read.
 */
async function partialResponse(request: Request, response: Response): Promise<Response> {
  const body = await response.blob()
  const match = /^bytes=(\d*)-(\d*)$/i.exec(request.headers.get('range')!.trim())
  const start = match?.[1] ? Number(match[1]) : Math.max(0, body.size - Number(match?.[2]))
  const end = match?.[1] && match[2] ? Math.min(Number(match[2]), body.size - 1) : body.size - 1
  const headers = new Headers(response.headers)
  headers.set('Accept-Ranges', 'bytes')
  if (
    !match ||
    (!match[1] && !match[2]) ||
    start >= body.size ||
    start > end ||
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end)
  ) {
    headers.set('Content-Range', `bytes */${body.size}`)
    headers.set('Content-Length', '0')
    return new Response(null, { status: 416, headers })
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${body.size}`)
  headers.set('Content-Length', String(end - start + 1))
  return new Response(body.slice(start, end + 1), { status: 206, headers })
}
