/**
  * To learn more about Playwright Test visit:
  * https://www.checklyhq.com/docs/browser-checks/playwright-test/
  * https://playwright.dev/docs/writing-tests
  */

import { test, expect } from '@playwright/test'

// Set the action timeout to 10 seconds to quickly identify failing actions.
// By default Playwright Test has no timeout for actions (e.g. clicking an element).
// Learn more here: https://www.checklyhq.com/docs/browser-checks/timeouts/
test.use({ actionTimeout: 10000 })

test('interact with form elements', async ({ page }) => {
  await page.goto(process.env.ENVIRONMENT_URL || 'https://preview--new-hanafuda.netlify.app/')

  // Login as guest
  await page.locator('#guest-login-button').click()

  await page.screenshot({
    path: 'screenshot.png',
  })

  // Verify title and buttons visible
  await expect(page.locator('#hero-title')).toBeVisible()
  await expect(page.locator('#start-button')).toBeVisible()
  // await expect(page.locator('#account-link-button')).toBeVisible()

  await page.screenshot({
    path: 'screenshot.png',
  })

  // Logout
  await page.locator('#exit-button').click()
  await expect(page.locator('#guest-login-button')).toBeVisible()
})
