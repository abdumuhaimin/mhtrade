import { test, expect } from '@playwright/test'
import { mockApis, TWO_STOCK_POSITIONS, MOCK_OPEN_ORDER } from './helpers'

// ── Day change in watchlist ───────────────────────────────────────────────────
test.describe('Watchlist day change', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('mhterm_watchlist'))
    await mockApis(page)
    await page.goto('/')
    await expect(page.getByText('WATCHLIST')).toBeVisible({ timeout: 15000 })
  })

  test('shows a percentage change for each ticker once data loads', async ({ page }) => {
    // Wait for both prevClose (YF) and latestQuote (alpaca-data) to resolve
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/yf/') && r.status() === 200),
      page.waitForResponse(r => r.url().includes('quotes/latest') && r.status() === 200),
    ])
    await page.waitForTimeout(300)
    // Mock: prevClose=199.5, quote midpoint=450 → change ~+125.56%
    const changeItems = await page.getByText(/\+\d+\.\d{2}%/).all()
    expect(changeItems.length).toBeGreaterThan(0)
  })

  test('default symbols are all visible in the watchlist bar', async ({ page }) => {
    for (const sym of ['SPY', 'QQQ', 'NVDA', 'TSLA']) {
      // scope to the watchlist area to avoid matching the chart header
      const watchlist = page.locator('span', { hasText: 'WATCHLIST' }).locator('../..')
      await expect(watchlist.getByText(sym, { exact: true }).first()).toBeVisible()
    }
  })
})

// ── Price alerts ──────────────────────────────────────────────────────────────
test.describe('Watchlist price alerts', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('mhterm_watchlist')
      localStorage.removeItem('mhterm_alerts')
    })
    await mockApis(page)
    await page.goto('/')
    await expect(page.getByText('WATCHLIST')).toBeVisible({ timeout: 15000 })
  })

  test('hovering a ticker reveals the flag alert icon', async ({ page }) => {
    await page.locator('text=SPY').first().hover()
    await expect(page.getByTitle(/Set alert for SPY/)).toBeVisible()
  })

  test('clicking the flag opens the alert modal', async ({ page }) => {
    await page.locator('text=SPY').first().hover()
    await page.getByTitle(/Set alert for SPY/).click()
    await expect(page.getByText('PRICE ALERT — SPY')).toBeVisible()
  })

  test('alert modal has price input and ABOVE / BELOW buttons', async ({ page }) => {
    await page.locator('text=SPY').first().hover()
    await page.getByTitle(/Set alert for SPY/).click()
    await expect(page.getByPlaceholder('0.00')).toBeVisible()
    await expect(page.getByRole('button', { name: /ABOVE/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /BELOW/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'SET ALERT' })).toBeVisible()
  })

  test('setting an alert persists it to localStorage', async ({ page }) => {
    await page.locator('text=SPY').first().hover()
    await page.getByTitle(/Set alert for SPY/).click()
    await page.getByPlaceholder('0.00').fill('500')
    await page.getByRole('button', { name: 'SET ALERT' }).click()

    const alerts = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('mhterm_alerts') ?? '[]')
    )
    expect(alerts).toContainEqual(expect.objectContaining({ sym: 'SPY', price: 500 }))
  })

  test('after setting alert the active flag icon (⚑) stays visible without hover', async ({ page }) => {
    await page.locator('text=SPY').first().hover()
    await page.getByTitle(/Set alert for SPY/).click()
    await page.getByPlaceholder('0.00').fill('600')
    await page.getByRole('button', { name: 'SET ALERT' }).click()
    // Modal should close
    await expect(page.getByText('PRICE ALERT — SPY')).not.toBeVisible()
    // Active flag persists without hover
    await page.mouse.move(0, 400) // move away to un-hover
    await expect(page.getByTitle(/Alert set — click to clear/)).toBeVisible()
  })

  test('backdrop click closes the alert modal', async ({ page }) => {
    await page.locator('text=SPY').first().hover()
    await page.getByTitle(/Set alert for SPY/).click()
    await expect(page.getByText('PRICE ALERT — SPY')).toBeVisible()
    await page.mouse.click(10, 400) // click backdrop (outside the modal)
    await expect(page.getByText('PRICE ALERT — SPY')).not.toBeVisible()
  })
})

// ── Volume bars in PriceChart ─────────────────────────────────────────────────
test.describe('PriceChart volume bars', () => {
  // Scope waits to the chart panel header (which has the timeframe buttons)
  const chartPanelHeader = (page: any) =>
    page.locator('.panel-header').filter({ has: page.getByRole('button', { name: '1D', exact: true }) })

  test.beforeEach(async ({ page }) => {
    await mockApis(page)
    await page.goto('/')
    await expect(chartPanelHeader(page)).toBeVisible({ timeout: 15000 })
  })

  test('price chart panel header renders with default symbol', async ({ page }) => {
    await expect(chartPanelHeader(page)).toBeVisible()
  })

  test('all timeframe buttons are present', async ({ page }) => {
    const header = chartPanelHeader(page)
    for (const tf of ['1Min', '5Min', '15Min', '1H', '1D']) {
      await expect(header.getByRole('button', { name: tf, exact: true })).toBeVisible()
    }
  })

  test('switching timeframes does not crash the chart', async ({ page }) => {
    await chartPanelHeader(page).getByRole('button', { name: '1H', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(chartPanelHeader(page)).toBeVisible()
  })
})

// ── Cancel order ──────────────────────────────────────────────────────────────
test.describe('Orders cancel button', () => {
  // Wait for the Orders panel header span (not the wrapper div)
  const ordersReady = (page: any) =>
    expect(page.locator('.panel-header').filter({ hasText: /^Orders/ }).first())
      .toBeVisible({ timeout: 15000 })

  test.beforeEach(async ({ page }) => {
    await mockApis(page, [], [MOCK_OPEN_ORDER])
    await page.goto('/')
    await ordersReady(page)
  })

  test('open orders tab shows the mocked order', async ({ page }) => {
    const ordersPanel = page.locator('.panel').filter({ has: page.locator('.panel-header').filter({ hasText: /^Orders/ }) })
    await expect(ordersPanel.getByText('SPY', { exact: true }).first()).toBeVisible()
    await expect(ordersPanel.getByText('NEW', { exact: true })).toBeVisible()
  })

  test('cancel button (✕) is visible on an open order row', async ({ page }) => {
    const ordersPanel = page.locator('.panel').filter({ has: page.locator('.panel-header').filter({ hasText: /^Orders/ }) })
    const cancelBtn = ordersPanel.locator('table button').filter({ hasText: '✕' })
    await expect(cancelBtn.first()).toBeVisible()
  })

  test('clicking cancel fires DELETE to the orders endpoint', async ({ page }) => {
    let deleteCalled = false
    await page.route('**/alpaca-trade/**', async route => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true
        return route.fulfill({ status: 204, body: '' })
      }
      return route.fulfill({ json: [] })
    })

    const ordersPanel = page.locator('.panel').filter({ has: page.locator('.panel-header').filter({ hasText: /^Orders/ }) })
    await ordersPanel.locator('table button').filter({ hasText: '✕' }).first().click()
    await page.waitForTimeout(500)
    expect(deleteCalled).toBe(true)
  })
})

// ── New order form ────────────────────────────────────────────────────────────
test.describe('Orders — new order form', () => {
  const ordersPanel = (page: any) =>
    page.locator('.panel').filter({ has: page.locator('.panel-header').filter({ hasText: /^Orders/ }) })
  const ordersReady = (page: any) =>
    expect(page.locator('.panel-header').filter({ hasText: /^Orders/ }).first())
      .toBeVisible({ timeout: 15000 })

  test.beforeEach(async ({ page }) => {
    await mockApis(page)
    await page.goto('/')
    await ordersReady(page)
  })

  test('+ New tab is visible in the Orders panel', async ({ page }) => {
    await expect(ordersPanel(page).getByRole('button', { name: '+ New' })).toBeVisible()
  })

  test('clicking + New shows BUY/SELL, MKT/LMT toggles and inputs', async ({ page }) => {
    await ordersPanel(page).getByRole('button', { name: '+ New' }).click()
    const p = ordersPanel(page)
    await expect(p.getByRole('button', { name: 'BUY', exact: true })).toBeVisible()
    await expect(p.getByRole('button', { name: 'SELL', exact: true })).toBeVisible()
    await expect(p.getByRole('button', { name: 'MKT', exact: true })).toBeVisible()
    await expect(p.getByRole('button', { name: 'LMT', exact: true })).toBeVisible()
    await expect(p.getByPlaceholder('SPY')).toBeVisible()
    await expect(p.getByPlaceholder('1')).toBeVisible()
  })

  test('TIF dropdown has DAY, GTC, IOC, FOK options', async ({ page }) => {
    await ordersPanel(page).getByRole('button', { name: '+ New' }).click()
    const tif = ordersPanel(page).getByRole('combobox')
    const options = await tif.evaluate(el =>
      [...(el as HTMLSelectElement).options].map(o => o.value)
    )
    expect(options).toEqual(['day', 'gtc', 'ioc', 'fok'])
  })

  test('submitting a valid market order posts to /v2/orders', async ({ page }) => {
    let postBody: any = null
    await page.route('**/alpaca-trade/v2/orders', async route => {
      if (route.request().method() === 'POST') {
        postBody = JSON.parse(route.request().postData() ?? '{}')
        return route.fulfill({ json: { id: 'new-999', status: 'new', symbol: postBody.symbol } })
      }
      return route.fulfill({ json: [] })
    })

    const p = ordersPanel(page)
    await p.getByRole('button', { name: '+ New' }).click()
    await p.getByPlaceholder('SPY').fill('NVDA')
    await p.getByPlaceholder('1').fill('5')
    await p.getByRole('button', { name: /PLACE BUY ORDER/i }).click()

    await page.waitForTimeout(600)
    expect(postBody).toMatchObject({ symbol: 'NVDA', qty: '5', side: 'buy', type: 'market' })
  })

  test('shows validation error when symbol is empty', async ({ page }) => {
    const p = ordersPanel(page)
    await p.getByRole('button', { name: '+ New' }).click()
    await p.getByPlaceholder('1').fill('5')
    await p.getByRole('button', { name: /PLACE BUY ORDER/i }).click()
    await expect(p.getByText('Symbol required')).toBeVisible()
  })

  test('shows validation error when qty is missing', async ({ page }) => {
    const p = ordersPanel(page)
    await p.getByRole('button', { name: '+ New' }).click()
    await p.getByPlaceholder('SPY').fill('AAPL')
    await p.getByRole('button', { name: /PLACE BUY ORDER/i }).click()
    await expect(p.getByText('Qty required')).toBeVisible()
  })

  test('limit price input is disabled in market mode', async ({ page }) => {
    const p = ordersPanel(page)
    await p.getByRole('button', { name: '+ New' }).click()
    await expect(p.getByPlaceholder('0.00')).toBeDisabled()
  })

  test('limit price input enables when LMT is selected', async ({ page }) => {
    const p = ordersPanel(page)
    await p.getByRole('button', { name: '+ New' }).click()
    await p.getByRole('button', { name: 'LMT' }).click()
    await expect(p.getByPlaceholder('0.00')).toBeEnabled()
  })
})

// ── PortfolioChart 1Y label ───────────────────────────────────────────────────
test.describe('PortfolioChart period buttons', () => {
  const equityPanel = (page: any) =>
    page.locator('.panel-header').filter({ hasText: 'Equity Curve' })

  test.beforeEach(async ({ page }) => {
    await mockApis(page)
    await page.goto('/')
    await expect(equityPanel(page)).toBeVisible({ timeout: 15000 })
  })

  test('shows 1Y button, not 1A', async ({ page }) => {
    const panel = page.locator('.panel').filter({ has: equityPanel(page) })
    await expect(panel.getByRole('button', { name: '1Y', exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: '1A', exact: true })).not.toBeVisible()
  })

  test('all four period buttons are present', async ({ page }) => {
    const panel = page.locator('.panel').filter({ has: equityPanel(page) })
    for (const p of ['1W', '1M', '3M', '1Y']) {
      await expect(panel.getByRole('button', { name: p, exact: true })).toBeVisible()
    }
  })
})

// ── Positions L/S badge ───────────────────────────────────────────────────────
test.describe('PositionsBook L/S badge', () => {
  const positionsPanel = (page: any) =>
    page.locator('.panel').filter({ has: page.locator('.panel-header span', { hasText: 'Positions' }).first() })

  test.beforeEach(async ({ page }) => {
    await mockApis(page, TWO_STOCK_POSITIONS)
    await page.goto('/')
    await expect(page.locator('.panel-header span', { hasText: 'Positions' }).first())
      .toBeVisible({ timeout: 15000 })
  })

  test('L badge is visible for long positions', async ({ page }) => {
    const panel = positionsPanel(page)
    await expect(panel.getByText('L').first()).toBeVisible()
  })

  test('each position row shows the L badge', async ({ page }) => {
    const panel = positionsPanel(page)
    // Wait for both position symbols to render before counting badges
    await expect(panel.getByText('AAPL', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(panel.getByText('MSFT', { exact: true })).toBeVisible({ timeout: 5000 })
    // Exact match prevents substring hits on 'AAPL' etc.
    const badges = await panel.getByText('L', { exact: true }).all()
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })
})
