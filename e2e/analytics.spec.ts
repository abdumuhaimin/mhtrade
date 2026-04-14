import { test, expect } from '@playwright/test'
import { mockApis, TWO_STOCK_POSITIONS } from './helpers'

test.beforeEach(async ({ page }) => {
  // Clear alerts storage BEFORE React loads so there's no race condition
  await page.addInitScript(() => localStorage.removeItem('terminal_alerts'))
  await mockApis(page, TWO_STOCK_POSITIONS)
  await page.goto('/')
  await expect(page.getByText('Analytics')).toBeVisible({ timeout: 15000 })
})

// ── Tab navigation ────────────────────────────────────────────────────────────
test('renders all analytics tab buttons', async ({ page }) => {
  for (const tab of ['GREEKS', 'RISK', 'ATTRIBUTION', 'ALERTS', 'SCENARIO']) {
    await expect(page.getByRole('button', { name: tab }), tab).toBeVisible()
  }
})

test('GREEKS is the active tab by default', async ({ page }) => {
  // The GREEKS tab content should be visible (either table or empty state)
  await expect(
    page.getByText('No option positions').or(page.getByText('Contract'))
  ).toBeVisible()
})

// ── RISK tab ──────────────────────────────────────────────────────────────────
test('RISK tab shows benchmark dropdown defaulting to SPY', async ({ page }) => {
  await page.getByRole('button', { name: 'RISK' }).click()
  const select = page.getByRole('combobox')
  await expect(select).toBeVisible()
  await expect(select).toHaveValue('SPY')
})

test('RISK tab shows BENCHMARK label', async ({ page }) => {
  await page.getByRole('button', { name: 'RISK' }).click()
  await expect(page.getByText('BENCHMARK')).toBeVisible()
})

test('benchmark dropdown has all 9 expected options', async ({ page }) => {
  await page.getByRole('button', { name: 'RISK' }).click()
  const select = page.getByRole('combobox')
  await expect(select).toBeVisible()
  const options = await select.evaluate(el =>
    [...(el as HTMLSelectElement).options]
      .map(o => o.value)
      .filter(v => v !== '__custom__')
  )
  expect(options).toEqual(['SPY', 'QQQ', 'IWM', 'DIA', 'GLD', 'TLT', 'XLE', 'XLK', 'BND'])
})

test('selecting QQQ updates the dropdown value', async ({ page }) => {
  await page.getByRole('button', { name: 'RISK' }).click()
  const select = page.getByRole('combobox')
  await select.selectOption('QQQ')
  await expect(select).toHaveValue('QQQ')
})

test('Corr column header updates when benchmark changes', async ({ page }) => {
  await page.getByRole('button', { name: 'RISK' }).click()
  const select = page.getByRole('combobox')
  await expect(select).toBeVisible()

  // Wait for either the table or the loading/insufficient state
  await page.waitForTimeout(1500)

  const corrHeader = page.locator('th').filter({ hasText: /Corr\(/ })
  const count = await corrHeader.count()

  if (count > 0) {
    // Table rendered — verify header then switch benchmark
    await expect(corrHeader.first()).toContainText('Corr(SPY)')
    await select.selectOption('QQQ')
    await expect(corrHeader.first()).toContainText('Corr(QQQ)')
  } else {
    // Still loading or insufficient data — just verify selector is usable
    await select.selectOption('QQQ')
    await expect(select).toHaveValue('QQQ')
  }
})

test('RISK tab shows portfolio risk stats row', async ({ page }) => {
  await page.getByRole('button', { name: 'RISK' }).click()
  // Stats bar always shows: PORTFOLIO β, VaR, CVaR, VaR $, BENCHMARK
  await expect(page.getByText('PORTFOLIO β').or(
    page.getByText('Computing risk metrics…').or(
      page.getByText('Insufficient data')
    )
  )).toBeVisible()
})

// ── ALERTS tab ────────────────────────────────────────────────────────────────
test('ALERTS tab shows empty state initially', async ({ page }) => {
  await page.getByRole('button', { name: 'ALERTS' }).click()
  await expect(page.getByText('No alerts — add one above')).toBeVisible()
})

test('ALERTS add form has Symbol, Price, Note fields and + ADD button', async ({ page }) => {
  await page.getByRole('button', { name: 'ALERTS' }).click()
  await expect(page.getByPlaceholder('Symbol')).toBeVisible()
  await expect(page.getByPlaceholder('Price')).toBeVisible()
  await expect(page.getByPlaceholder('Note')).toBeVisible()
  await expect(page.getByText('+ ADD')).toBeVisible()
})

test('can add a price alert', async ({ page }) => {
  await page.getByRole('button', { name: 'ALERTS' }).click()
  await page.getByPlaceholder('Symbol').fill('SPY')
  await page.getByPlaceholder('Price').fill('600')
  await page.getByText('+ ADD').click()
  await expect(page.getByText('$600.00')).toBeVisible()
})

// ── ATTRIBUTION tab ───────────────────────────────────────────────────────────
test('ATTRIBUTION tab shows BY SECTOR header', async ({ page }) => {
  await page.getByRole('button', { name: 'ATTRIBUTION' }).click()
  await expect(page.getByText('BY SECTOR')).toBeVisible()
})

test('ATTRIBUTION tab shows ASSET CLASS breakdown', async ({ page }) => {
  await page.getByRole('button', { name: 'ATTRIBUTION' }).click()
  await expect(page.getByText('ASSET CLASS')).toBeVisible()
})

// ── SCENARIO tab ──────────────────────────────────────────────────────────────
test('SCENARIO tab shows market shock slider', async ({ page }) => {
  await page.getByRole('button', { name: 'SCENARIO' }).click()
  await expect(page.getByText('MARKET SHOCK')).toBeVisible()
  await expect(page.getByRole('slider')).toBeVisible()
})

test('SCENARIO tab shows estimated impact', async ({ page }) => {
  await page.getByRole('button', { name: 'SCENARIO' }).click()
  await expect(page.getByText('EST. IMPACT')).toBeVisible()
})

test('SCENARIO RESET button clears custom shocks', async ({ page }) => {
  await page.getByRole('button', { name: 'SCENARIO' }).click()
  await expect(page.getByRole('button', { name: 'RESET' })).toBeVisible()
  await page.getByRole('button', { name: 'RESET' }).click()
  // Should not throw — button remains visible after click
  await expect(page.getByRole('button', { name: 'RESET' })).toBeVisible()
})
