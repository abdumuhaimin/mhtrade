import type { Page } from '@playwright/test'

// ── Mock API responses shared across E2E tests ────────────────────────────────

function makeYFChart(n = 10, base = 200) {
  const now = Math.floor(Date.now() / 1000)
  const timestamps = Array.from({ length: n }, (_, i) => now - (n - i) * 86_400)
  const close = Array.from({ length: n }, (_, i) => base + i * 0.5)
  return {
    chart: {
      result: [{
        timestamp: timestamps,
        indicators: {
          quote: [{
            open:  close.map(c => c - 0.2),
            high:  close.map(c => c + 0.5),
            low:   close.map(c => c - 0.5),
            close,
          }],
        },
      }],
    },
  }
}

export async function mockApis(page: Page, positions: object[] = []) {
  await page.route('**/alpaca-trade/**', route => {
    const url = route.request().url()
    // More-specific checks must come before generic ones
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
        equity: '100000', last_equity: '99000', buying_power: '100000',
      }})
    if (url.includes('/v2/orders'))
      return route.fulfill({ json: [] })
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
    unrealized_pl: '100', avg_entry_price: '250' },
  { symbol: 'MSFT', qty: '5',  market_value: '1850', asset_class: 'us_equity',
    unrealized_pl: '-50', avg_entry_price: '375' },
]
