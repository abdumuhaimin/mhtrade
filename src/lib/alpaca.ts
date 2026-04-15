const KEY    = import.meta.env.VITE_ALPACA_KEY
const SECRET = import.meta.env.VITE_ALPACA_SECRET
const BASE   = import.meta.env.VITE_ALPACA_BASE
const DATA   = import.meta.env.VITE_ALPACA_DATA

const headers = {
  'APCA-API-KEY-ID': KEY,
  'APCA-API-SECRET-KEY': SECRET,
  'Content-Type': 'application/json',
}

async function get(url: string) {
  const r = await fetch(url, { headers })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

// ── Yahoo Finance bar fetcher ─────────────────────────────────────────────────
// Alpaca free tier doesn't provide historical OHLCV bars, so we use YF instead.
const YF_MAP: Record<string, { interval: string; range: string }> = {
  '1Min':  { interval: '1m',  range: '1d'  },
  '5Min':  { interval: '5m',  range: '5d'  },
  '15Min': { interval: '15m', range: '5d'  },
  '1Hour': { interval: '1h',  range: '1mo' },
  '1Day':  { interval: '1d',  range: '6mo' },
}

async function fetchYFBars(symbol: string, timeframe: string) {
  const { interval, range } = YF_MAP[timeframe] ?? YF_MAP['1Day']
  const url = `/yf/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&includePrePost=false`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`YF ${r.status} ${symbol}`)
  const data = await r.json()
  const result = data?.chart?.result?.[0]
  if (!result) return []
  const timestamps: number[] = result.timestamp ?? []
  const q = result.indicators?.quote?.[0] ?? {}
  return timestamps
    .map((t, i) => ({
      t: new Date(t * 1000).toISOString(),
      o: q.open?.[i]   as number,
      h: q.high?.[i]   as number,
      l: q.low?.[i]    as number,
      c: q.close?.[i]  as number,
      v: (q.volume?.[i] ?? 0) as number,
    }))
    .filter(b => b.o != null && b.c != null)
}

export const api = {
  account:   () => get(`${BASE}/v2/account`),
  positions: () => get(`${BASE}/v2/positions`),
  orders:    (status = 'all', limit = 40) =>
    get(`${BASE}/v2/orders?status=${status}&limit=${limit}&direction=desc`),
  portfolio: (period = '1M', timeframe = '1D') =>
    get(`${BASE}/v2/account/portfolio/history?period=${period}&timeframe=${timeframe}&extended_hours=false`),
  optionSnapshots: (contractSymbols: string[]) =>
    get(`${DATA}/v1beta1/options/snapshots?symbols=${contractSymbols.join(',')}&feed=indicative`),

  // Single-symbol bars for PriceChart — returns { bars: Bar[] }
  bars: async (symbol: string, timeframe = '1Day') => ({
    bars: await fetchYFBars(symbol, timeframe),
  }),

  // Multi-symbol bars for Analytics — returns { bars: Record<string, Bar[]> }
  barsMulti: async (symbols: string[], timeframe = '1Day') => {
    const results = await Promise.all(symbols.map(s => fetchYFBars(s, timeframe)))
    const bars: Record<string, any[]> = {}
    symbols.forEach((s, i) => { bars[s] = results[i] })
    return { bars }
  },

  latestQuote: (symbols: string[]) =>
    get(`${DATA}/v2/stocks/quotes/latest?symbols=${symbols.join(',')}&feed=iex`),

  prevClose: async (symbols: string[]): Promise<Record<string, number | null>> => {
    const results = await Promise.all(symbols.map(async (sym) => {
      try {
        const r = await fetch(`/yf/v8/finance/chart/${sym}?interval=1d&range=5d`)
        if (!r.ok) return [sym, null]
        const data = await r.json()
        const meta = data?.chart?.result?.[0]?.meta
        const pc = meta?.chartPreviousClose ?? meta?.previousClose ?? null
        return [sym, pc as number | null]
      } catch { return [sym, null] }
    }))
    return Object.fromEntries(results)
  },

  cancelOrder: (id: string) =>
    fetch(`${BASE}/v2/orders/${id}`, { method: 'DELETE', headers }).then(r => {
      if (r.status === 204) return
      return r.json().then((b: any) => { throw new Error(b.message ?? `${r.status}`) })
    }),

  placeOrder: (o: {
    symbol: string; qty: string; side: 'buy' | 'sell';
    type: 'market' | 'limit'; time_in_force: string; limit_price?: string;
  }) =>
    fetch(`${BASE}/v2/orders`, {
      method: 'POST', headers, body: JSON.stringify(o),
    }).then(async r => {
      if (!r.ok) {
        const b = await r.json().catch(() => ({}))
        throw new Error((b as any).message ?? `${r.status}`)
      }
      return r.json()
    }),
}

export const WS_KEY    = KEY
export const WS_SECRET = SECRET
