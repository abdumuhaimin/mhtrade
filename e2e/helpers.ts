import type { Page } from '@playwright/test'

// ── Mock API responses shared across E2E tests ────────────────────────────────

function makeYFChart(n = 10, base = 200) {
  const now = Math.floor(Date.now() / 1000)
  const timestamps = Array.from({ length: n }, (_, i) => now - (n - i) * 86_400)
  const close  = Array.from({ length: n }, (_, i) => base + i * 0.5)
  const volume = Array.from({ length: n }, () => Math.floor(Math.random() * 50_000_000 + 10_000_000))
  return {
    chart: {
      result: [{
        meta: { chartPreviousClose: base - 0.5 },
        timestamp: timestamps,
        indicators: {
          quote: [{
            open:   close.map(c => c - 0.2),
            high:   close.map(c => c + 0.5),
            low:    close.map(c => c - 0.5),
            close,
            volume,
          }],
        },
      }],
    },
  }
}

export const MOCK_OPEN_ORDER = {
  id: 'order-abc-123',
  symbol: 'SPY',
  side: 'buy',
  type: 'limit',
  qty: '10',
  filled_qty: '0',
  limit_price: '450.00',
  stop_price: null,
  status: 'new',
  created_at: new Date().toISOString(),
  filled_avg_price: null,
  order_class: 'simple',
  asset_class: 'us_equity',
}

export async function mockApis(page: Page, positions: object[] = [], orders: object[] = []) {
  await page.route('**/alpaca-trade/**', async route => {
    const req = route.request()
    const url = req.url()
    const method = req.method()

    // Cancel order — DELETE /v2/orders/:id
    if (method === 'DELETE' && url.includes('/v2/orders/')) {
      return route.fulfill({ status: 204, body: '' })
    }

    // Place order — POST /v2/orders
    if (method === 'POST' && url.includes('/v2/orders')) {
      const body = JSON.parse(req.postData() ?? '{}')
      return route.fulfill({ json: {
        id: 'order-new-999',
        symbol: body.symbol ?? 'SPY',
        side: body.side ?? 'buy',
        type: body.type ?? 'market',
        qty: body.qty ?? '1',
        filled_qty: '0',
        limit_price: body.limit_price ?? null,
        stop_price: null,
        status: 'new',
        created_at: new Date().toISOString(),
        filled_avg_price: null,
        order_class: 'simple',
        asset_class: 'us_equity',
      }})
    }

    // More-specific GET checks must come before generic ones
    if (url.includes('/portfolio/history'))
      return route.fulfill({ json: {
        timestamp: [1704067200, 1704153600, 1704240000],
        equity: [98000, 99000, 100000],
        profit_loss: [1000, 2000, 3000],
        profit_loss_pct: [0.01, 0.02, 0.03],
      }})
    if (url.includes('/v2/positions'))
      return route.fulfill({ json: positions })
    if (url.includes('/v2/account'))
      return route.fulfill({ json: {
        portfolio_value: '100000', cash: '25000',
        equity: '100000', last_equity: '99000',
        buying_power: '100000', options_buying_power: '12500',
      }})
    if (url.includes('/v2/orders'))
      return route.fulfill({ json: orders })
    return route.fulfill({ json: {} })
  })

  await page.route('**/alpaca-data/**', route => {
    const url = route.request().url()
    if (url.includes('/v2/stocks/quotes/latest')) {
      const raw = new URL(url).searchParams.get('symbols') ?? ''
      const quotes: Record<string, object> = {}
      raw.split(',').filter(Boolean).forEach(s => {
        quotes[s] = { ap: 450.05, bp: 449.95, as: 100, bs: 100, t: new Date().toISOString() }
      })
      return route.fulfill({ json: { quotes } })
    }
    return route.fulfill({ json: {} })
  })

  await page.route('**/yf/**', route =>
    route.fulfill({ json: makeYFChart(30, 200) })
  )
}

export const TWO_STOCK_POSITIONS = [
  { symbol: 'AAPL', qty: '10', market_value: '2600', asset_class: 'us_equity',
    unrealized_pl: '100', avg_entry_price: '250', side: 'long', current_price: '260',
    unrealized_plpc: '0.04', cost_basis: '2500' },
  { symbol: 'MSFT', qty: '5',  market_value: '1850', asset_class: 'us_equity',
    unrealized_pl: '-50', avg_entry_price: '375', side: 'long', current_price: '370',
    unrealized_plpc: '-0.013', cost_basis: '1875' },
]
