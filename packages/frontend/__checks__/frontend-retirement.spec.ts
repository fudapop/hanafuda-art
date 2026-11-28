import { createServer, type Server } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { expect, test } from '@playwright/test'

// Step 5: serve the actual `pnpm generate` output, never a source-only harness.
// Build with disposable Firebase config and dotenv disabled before running.
const output = resolve('.output/public')
const legacyOrigin = 'https://ymoriyakbittfgocvxbw.supabase.co'
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
  'base64',
)
let server: Server
let origin: string

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url!, 'http://fixture').pathname)
    const path = resolve(output, `.${pathname}`)
    if (!path.startsWith(output + sep)) {
      res.writeHead(403).end()
      return
    }
    try {
      const types: Record<string, string> = {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.json': 'application/json',
        '.wasm': 'application/wasm',
      }
      const file = extname(path) ? path : join(path, 'index.html')
      res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
      res.end(await readFile(file))
    } catch {
      res.setHeader('Content-Type', 'text/html')
      res.end(await readFile(join(output, '200.html')))
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('fixture did not bind')
  origin = `http://127.0.0.1:${address.port}`
})

test.afterAll(() => {
  server?.closeAllConnections()
  server?.close()
})

test('step 5: emitted application and worker contain compatibility mapping, not a Supabase SDK', async () => {
  const files = await readdir(output, { recursive: true })
  const mappingFiles: string[] = []
  for (const file of files.filter((file) => /\.(js|css|html)$/.test(file))) {
    const source = await readFile(join(output, file), 'utf8')
    if (source.includes(legacyOrigin)) mappingFiles.push(file)
    // Keep the intentional exact public hostname; reject additional SDK/config callers.
    expect(source.replaceAll(legacyOrigin, ''), file).not.toMatch(
      /supabase|GoTrueClient|PostgrestClient|\/rest\/v1\/|\/realtime\/v1\//i,
    )
  }
  expect(mappingFiles.some((file) => file.startsWith('_nuxt/'))).toBe(true)
  expect(mappingFiles.some((file) => /^r2-assets-.+\.js$/.test(file))).toBe(true)
})

test('step 5: fresh emitted app hydrates without Supabase config or online services', async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const requests: string[] = []
  const errors: string[] = []
  try {
    // All external traffic is intercepted before network access. No sign-in or writes.
    await context.route('**/*', async (route) => {
      const url = route.request().url()
      requests.push(url)
      if (url.startsWith(origin + '/')) return route.continue()
      if (url.startsWith('https://assets.fudapop.com/')) {
        return route.fulfill({
          contentType: 'image/png',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: pixel,
        })
      }
      return route.abort()
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${origin}/sign-in?exit=true`)
    await expect(page.locator('#email')).toBeVisible()
    await page.locator('#email').fill('fixture@example.invalid')
    await expect(page.locator('#email')).toHaveValue('fixture@example.invalid')
    const logo = page.locator('[data-sign-in-logo] img')
    await expect(logo).toHaveAttribute('src', 'https://assets.fudapop.com/assets/logo-title.webp')
    await expect.poll(() => logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(1)
    const state = await page.evaluate(() => ({
      config: (document.querySelector('#__nuxt') as unknown as {
        __vue_app__: { $nuxt: { $config: { public: Record<string, unknown> } } }
      }).__vue_app__.$nuxt.$config.public,
      controlled: !!navigator.serviceWorker.controller,
    }))
    expect(state.controlled).toBe(false)
    expect(JSON.stringify(state.config)).not.toMatch(/supabase/i)
    expect(state.config.vuefire).toMatchObject({
      config: { apiKey: 'test-api-key', projectId: 'demo-step5' },
    })
    expect(requests.some((url) => url.startsWith('https://assets.fudapop.com/'))).toBe(true)
    expect(requests.filter((url) => /supabase/i.test(url))).toEqual([])
    expect(errors).toEqual([])
  } finally {
    await context.close()
  }
})
