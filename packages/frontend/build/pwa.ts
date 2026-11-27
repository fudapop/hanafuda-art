import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { buildSync } from 'esbuild'

// A bundled companion keeps the resolver identical to the app's. Workbox
// serializes callbacks, so imported TS functions cannot be closed over there.
const source = buildSync({
  entryPoints: [resolve('worker/assets.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  target: 'es2022',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
}).outputFiles[0]!.text
const fileName = `r2-assets-${createHash('sha256').update(source).digest('hex').slice(0, 16)}.js`
export const assetWorker = { fileName, source }

export const workboxOptions = {
  // The existing off-board monitor alone decides when to activate a waiting
  // worker. Cleanup affects Workbox precaches, not runtime caches or game data.
  skipWaiting: false,
  clientsClaim: false,
  cleanupOutdatedCaches: true,
  disableDevLogs: true,
  importScripts: [fileName],
  globPatterns: ['**/*.{js,css,html,webp,png}'],
  navigateFallback: '/',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst' as const,
      options: {
        cacheName: 'google-fonts-cache',
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
}
