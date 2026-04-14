import { test, expect } from '@playwright/test'
import { mockApis } from './helpers'

test.beforeEach(async ({ page }) => {
  // Clear watchlist storage BEFORE React loads so there's no race condition
  await page.addInitScript(() => localStorage.removeItem('mhterm_watchlist'))
  await mockApis(page)
  await page.goto('/')
  await expect(page.getByText('WATCHLIST')).toBeVisible({ timeout: 15000 })
})

// ── Rendering ─────────────────────────────────────────────────────────────────
test('renders WATCHLIST bar with default symbols', async ({ page }) => {
  await expect(page.getByText('WATCHLIST')).toBeVisible()
  for (const sym of ['SPY', 'QQQ', 'NVDA', 'META', 'TSLA', 'AAPL', 'MSFT']) {
    await expect(page.getByText(sym).first(), `${sym} missing`).toBeVisible()
  }
})

test('shows + add button', async ({ page }) => {
  await expect(page.getByTitle('Add symbol')).toBeVisible()
})

// ── Add symbol ────────────────────────────────────────────────────────────────
test('clicking + reveals the TICKER input', async ({ page }) => {
  await page.getByTitle('Add symbol').click()
  await expect(page.getByPlaceholder('TICKER')).toBeVisible()
})

test('adds a new symbol on Enter', async ({ page }) => {
  await page.getByTitle('Add symbol').click()
  await page.getByPlaceholder('TICKER').fill('GOOG')
  await page.getByPlaceholder('TICKER').press('Enter')
  await expect(page.getByText('GOOG').first()).toBeVisible()
})

test('persists new symbol in localStorage', async ({ page }) => {
  await page.getByTitle('Add symbol').click()
  await page.getByPlaceholder('TICKER').fill('AMZN')
  await page.getByPlaceholder('TICKER').press('Enter')
  await expect(page.getByText('AMZN').first()).toBeVisible()
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('mhterm_watchlist') ?? '[]') as string[]
  )
  expect(saved).toContain('AMZN')
})

test('persists custom symbols after full page reload', async ({ page }) => {
  await page.getByTitle('Add symbol').click()
  await page.getByPlaceholder('TICKER').fill('NFLX')
  await page.getByPlaceholder('TICKER').press('Enter')
  await expect(page.getByText('NFLX').first()).toBeVisible()

  // The beforeEach addInitScript clears mhterm_watchlist on every navigation.
  // Register a second init script (runs after the clear) to restore the saved state.
  const saved = await page.evaluate(() => localStorage.getItem('mhterm_watchlist'))
  await page.addInitScript((data: string | null) => {
    if (data) localStorage.setItem('mhterm_watchlist', data)
  }, saved)

  await page.reload()
  await expect(page.getByText('WATCHLIST')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('NFLX').first()).toBeVisible()
})

test('does not add a duplicate symbol', async ({ page }) => {
  await page.getByTitle('Add symbol').click()
  await page.getByPlaceholder('TICKER').fill('SPY')
  await page.getByPlaceholder('TICKER').press('Enter')
  await page.waitForTimeout(300)
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('mhterm_watchlist') ?? '[]') as string[]
  )
  expect(saved.filter(s => s === 'SPY').length).toBeLessThanOrEqual(1)
})

test('cancels add with Escape and restores + button', async ({ page }) => {
  await page.getByTitle('Add symbol').click()
  await expect(page.getByPlaceholder('TICKER')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByPlaceholder('TICKER')).not.toBeVisible()
  await expect(page.getByTitle('Add symbol')).toBeVisible()
})

// ── Remove symbol ─────────────────────────────────────────────────────────────
test('hovering a symbol reveals the ✕ remove button', async ({ page }) => {
  const watchlist = page.locator('text=WATCHLIST').locator('..')
  await watchlist.locator('text=SPY').first().hover()
  await expect(page.getByLabel('Remove SPY')).toBeVisible()
})

test('clicking ✕ removes the symbol from the watchlist', async ({ page }) => {
  const watchlist = page.locator('text=WATCHLIST').locator('..')
  await watchlist.locator('text=SPY').first().hover()
  await page.getByLabel('Remove SPY').click()
  await expect(watchlist.locator('text=SPY')).not.toBeVisible()
})

test('removed symbol is deleted from localStorage', async ({ page }) => {
  const watchlist = page.locator('text=WATCHLIST').locator('..')
  await watchlist.locator('text=QQQ').first().hover()
  await page.getByLabel('Remove QQQ').click()
  await expect(watchlist.locator('text=QQQ')).not.toBeVisible()
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('mhterm_watchlist') ?? '[]') as string[]
  )
  expect(saved).not.toContain('QQQ')
})

// ── Click to select ───────────────────────────────────────────────────────────
test('clicking a symbol updates the price chart title', async ({ page }) => {
  // Click QQQ in watchlist — PriceChart should change to QQQ
  const watchlist = page.locator('text=WATCHLIST').locator('..')
  await watchlist.locator('text=QQQ').first().click()
  // The PriceChart panel header shows the symbol
  await expect(page.getByText('QQQ').nth(1)).toBeVisible()
})
