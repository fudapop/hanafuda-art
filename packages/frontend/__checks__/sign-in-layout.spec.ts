import { devices, expect, test, type Page } from '@playwright/test'

/**
 * Sign-in layout must stay stacked on a portrait phone even when the viewport
 * is shortened the way iOS shortens it for the keyboard. Real landscape
 * (wide and short) keeps the side-by-side layout from before this fix.
 *
 * Run against a local dev server:
 *   NUXT_TELEMETRY_DISABLED=1 pnpm dev
 *   pnpm exec playwright test __checks__/sign-in-layout.spec.ts --project=chromium --project=webkit
 */
const iphone = devices['iPhone 12']

test.use({
  ...iphone,
  baseURL: 'http://localhost:8888',
  serviceWorkers: 'block',
})

type Box = { x: number; y: number; width: number; height: number }

async function openSignIn(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport)
  await page.goto('/sign-in?exit=true', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#email')
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-sign-in-panel]')
    return !!panel && getComputedStyle(panel).opacity === '1'
  })
}

async function layout(page: Page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-sign-in-shell]') as HTMLElement
    const panel = document.querySelector('[data-sign-in-panel]') as HTMLElement
    const logo = document.querySelector('[data-sign-in-logo]') as HTMLElement
    const email = document.querySelector('#email') as HTMLElement
    const password = document.querySelector('#password') as HTMLElement
    const signIn = [...document.querySelectorAll('button')].find((button) =>
      /sign in/i.test(button.textContent || ''),
    ) as HTMLElement
    const box = (el: Element): Box => {
      const rect = el.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }
    const hit = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      const x = rect.x + rect.width / 2
      const y = Math.min(Math.max(rect.y + 8, 8), window.innerHeight - 8)
      const top = document.elementFromPoint(x, y)
      return top === el || el.contains(top)
    }
    return {
      shellClass: shell.className,
      panelClass: panel.className,
      orientation: matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait',
      wideLandscape: matchMedia('(orientation: landscape) and (min-width: 480px)').matches,
      shell: box(shell),
      panel: box(panel),
      logo: box(logo),
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      emailHit: hit(email),
      passwordHit: hit(password),
      signInHit: hit(signIn),
      signIn: box(signIn),
    }
  })
}

function expectStacked(metrics: Awaited<ReturnType<typeof layout>>) {
  expect(metrics.panel.x).toBeLessThan(24)
  expect(metrics.panel.width).toBeGreaterThan(metrics.innerWidth * 0.9)
  expect(metrics.logo.width).toBeGreaterThan(metrics.innerWidth * 0.9)
  expect(metrics.logo.y).toBeLessThan(metrics.panel.y + 40)
  expect(metrics.signIn.x).toBeLessThan(metrics.innerWidth * 0.2)
  expect(metrics.signIn.width).toBeGreaterThan(metrics.innerWidth * 0.6)
}

function expectSideBySide(metrics: Awaited<ReturnType<typeof layout>>) {
  expect(metrics.panel.x).toBeGreaterThan(metrics.innerWidth * 0.4)
  expect(metrics.panel.width).toBeLessThan(metrics.innerWidth * 0.6)
  expect(metrics.panel.width).toBeGreaterThan(metrics.innerWidth * 0.4)
  expect(metrics.logo.x).toBeLessThan(metrics.innerWidth * 0.2)
  expect(metrics.signIn.x).toBeGreaterThan(metrics.innerWidth * 0.4)
}

test('portrait phone keeps the logo above the form', async ({ page }) => {
  await openSignIn(page, { width: 390, height: 844 })
  const metrics = await layout(page)
  expect(metrics.orientation).toBe('portrait')
  expect(metrics.shellClass).toContain('flow-root')
  expect(metrics.shellClass).toContain('h-dvh')
  expect(metrics.shellClass).not.toContain('overflow-hidden')
  expectStacked(metrics)
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight + 1)
  expect(metrics.emailHit).toBe(true)
  expect(metrics.passwordHit).toBe(true)
  expect(metrics.signInHit).toBe(true)
})

test('a keyboard-height portrait viewport stays stacked', async ({ page }) => {
  await openSignIn(page, { width: 390, height: 450 })
  const metrics = await layout(page)
  expect(metrics.orientation).toBe('portrait')
  expect(metrics.wideLandscape).toBe(false)
  expectStacked(metrics)
  expect(metrics.emailHit).toBe(true)
})

test('a phone-width viewport that is wider than it is tall stays stacked', async ({ page }) => {
  await openSignIn(page, { width: 390, height: 340 })
  const metrics = await layout(page)
  expect(metrics.orientation).toBe('landscape')
  expect(metrics.wideLandscape).toBe(false)
  expect(metrics.panelClass).not.toMatch(/(?:^|\s)landscape:/)
  expectStacked(metrics)
  expect(metrics.emailHit).toBe(true)
})

test('a real landscape phone keeps the side-by-side layout', async ({ page }) => {
  await openSignIn(page, { width: 844, height: 390 })
  const metrics = await layout(page)
  expect(metrics.wideLandscape).toBe(true)
  expectSideBySide(metrics)
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight + 1)
  expect(metrics.emailHit).toBe(true)
  expect(metrics.signInHit).toBe(true)
})
