import { devices, expect, test, type Page } from '@playwright/test'

/**
 * Collection piles stay one card tall on a phone, and the field sits between
 * the two collections. The page is a static harness: it seeds the Pinia card
 * store locally and does not sign in or write to Firebase.
 *
 * Run against a local dev server:
 *   NUXT_TELEMETRY_DISABLED=1 API_KEY=test-api-key RECAPTCHA_KEY=test-recaptcha-key \
 *     NUXT_PUBLIC_SUPABASE_URL=https://ymoriyakbittfgocvxbw.supabase.co pnpm dev
 *   pnpm exec playwright test __checks__/board-layout.spec.ts --project=chromium --project=webkit
 */

type Box = { x: number; y: number; right: number; bottom: number; width: number; height: number }

type Pile = {
  owner: string
  type: string
  box: Box
  cardCount: number
  cardTops: number[]
  cardHeight: number
  label: Box | null
}

type Metrics = {
  innerWidth: number
  innerHeight: number
  scrollWidth: number
  scrollHeight: number
  piles: Pile[]
  fieldCards: Box[]
}

const { defaultBrowserType: _iphoneBrowser, ...iphone } = devices['iPhone 12']
const { defaultBrowserType: _desktopBrowser, ...desktop } = devices['Desktop Chrome']

function intersects(a: Box, b: Box, slop = 2) {
  return a.x < b.right - slop && a.right > b.x + slop && a.y < b.bottom - slop && a.bottom > b.y + slop
}

async function openBoard(page: Page, viewport: { width: number; height: number }, caseName: string) {
  await page.route('**/*', (route) => {
    const request = route.request()
    const url = request.url()
    const writesOffHost =
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      /firebase|googleapis|firestore|identitytoolkit|supabase|firebaseio|recaptcha/i.test(url)
    if (writesOffHost) return route.abort()
    return route.continue()
  })
  await page.setViewportSize(viewport)
  await page.goto(`/dev/board-layout?case=${caseName}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const pile = document.querySelector('[data-collection-pile] .card')
    const field = document.querySelector('[data-board-field] .card')
    if (!pile || !field) return false
    const pileBox = pile.getBoundingClientRect()
    const fieldBox = field.getBoundingClientRect()
    return pileBox.height > 24 && fieldBox.height > 24
  })
  // Card enter transitions move for 300ms. Measure after they settle.
  await page.waitForTimeout(400)
}

async function metrics(page: Page): Promise<Metrics> {
  return page.evaluate(() => {
    const box = (el: Element) => {
      const rect = el.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      }
    }
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect()
      return getComputedStyle(el).display !== 'none' && rect.width > 8 && rect.height > 8
    }
    const piles = [...document.querySelectorAll('[data-collection-pile]')]
      .filter(visible)
      .map((el) => {
        const cards = [...el.querySelectorAll('.card')].filter(visible).map(box)
        const label = el.querySelector('.coll-label')
        return {
          owner: el.getAttribute('data-collection-owner') || '',
          type: el.getAttribute('data-collection-pile') || '',
          box: box(el),
          cardCount: cards.length,
          cardTops: cards.map((card) => card.y),
          cardHeight: cards[0]?.height ?? 0,
          label: label && visible(label) ? box(label) : null,
        }
      })
    const fieldCards = [...document.querySelectorAll('[data-board-field] .card, [data-board-field] .card-slot')].filter(visible).map(box)
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      piles,
      fieldCards,
    }
  })
}

function expectNoHorizontalScroll(layout: Metrics) {
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1)
}

function expectPilesAreOneRow(layout: Metrics) {
  const withCards = layout.piles.filter((pile) => pile.cardCount > 0)
  expect(withCards.length).toBeGreaterThan(0)
  for (const pile of withCards) {
    const tops = pile.cardTops
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(4)
    expect(pile.box.height).toBeLessThanOrEqual(pile.cardHeight * 1.35)
    expect(pile.box.height).toBeGreaterThanOrEqual(pile.cardHeight * 0.85)
    if (pile.label) {
      expect(pile.label.x).toBeGreaterThanOrEqual(pile.box.x - 1)
      expect(pile.label.right).toBeLessThanOrEqual(pile.box.right + 1)
    }
  }
}

function expectFieldClear(layout: Metrics) {
  expect(layout.fieldCards.length).toBeGreaterThan(0)
  for (const pile of layout.piles) {
    for (const card of layout.fieldCards) {
      expect(intersects(pile.box, card), `${pile.owner} ${pile.type} overlaps a field card`).toBe(false)
    }
  }
}

test.describe('phone board', () => {
  test.use({
    ...iphone,
    baseURL: 'http://127.0.0.1:8888',
    serviceWorkers: 'block',
  })

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    for (const caseName of ['mid', 'stress'] as const) {
      test(`${viewport.width}x${viewport.height} ${caseName} keeps piles on one row`, async ({ page }) => {
        await openBoard(page, viewport, caseName)
        const layout = await metrics(page)
        expectNoHorizontalScroll(layout)
        expectPilesAreOneRow(layout)
        expectFieldClear(layout)
        if (caseName === 'stress') {
          const plains = layout.piles.find((pile) => pile.owner === 'player' && pile.type === 'plains')
          expect(plains?.cardCount).toBe(17)
          expect(layout.piles.find((pile) => pile.owner === 'player' && pile.type === 'brights')?.cardCount).toBe(5)
          expect(layout.piles.find((pile) => pile.owner === 'player' && pile.type === 'animals')?.cardCount).toBe(9)
          expect(layout.piles.find((pile) => pile.owner === 'player' && pile.type === 'ribbons')?.cardCount).toBe(10)
        }
      })
    }
  }
})

test.describe('desktop board', () => {
  test.use({
    ...desktop,
    baseURL: 'http://127.0.0.1:8888',
    serviceWorkers: 'block',
  })

  for (const caseName of ['mid', 'stress'] as const) {
    test(`1280x800 ${caseName} does not bring back horizontal scroll or wrapped piles`, async ({ page }) => {
      await openBoard(page, { width: 1280, height: 800 }, caseName)
      const layout = await metrics(page)
      expectNoHorizontalScroll(layout)
      expectPilesAreOneRow(layout)
      expectFieldClear(layout)
      const fieldTop = Math.min(...layout.fieldCards.map((card) => card.y))
      const fieldBottom = Math.max(...layout.fieldCards.map((card) => card.bottom))
      const opponentBottom = Math.max(
        ...layout.piles.filter((pile) => pile.owner === 'opponent').map((pile) => pile.box.bottom),
      )
      const playerTop = Math.min(
        ...layout.piles.filter((pile) => pile.owner === 'player').map((pile) => pile.box.y),
      )
      expect(fieldTop).toBeGreaterThanOrEqual(opponentBottom - 2)
      expect(fieldBottom).toBeLessThanOrEqual(playerTop + 2)
    })
  }
})
