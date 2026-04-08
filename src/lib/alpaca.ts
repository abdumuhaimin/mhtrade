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

export const api = {
  account:   () => get(`${BASE}/v2/account`),
  positions: () => get(`${BASE}/v2/positions`),
  orders:    (status = 'all', limit = 40) =>
    get(`${BASE}/v2/orders?status=${status}&limit=${limit}&direction=desc`),
  portfolio: (period = '1M', timeframe = '1D') =>
    get(`${BASE}/v2/account/portfolio/history?period=${period}&timeframe=${timeframe}&extended_hours=false`),
  optionSnapshots: (contractSymbols: string[]) =>
    get(`${DATA}/v1beta1/options/snapshots?symbols=${contractSymbols.join(',')}&feed=indicative`),
  bars: (symbol: string, timeframe = '1D', limit = 100) =>
    get(`${DATA}/v2/stocks/bars?symbols=${symbol}&timeframe=${timeframe}&limit=${limit}&feed=iex`),
  latestQuote: (symbols: string[]) =>
    get(`${DATA}/v2/stocks/quotes/latest?symbols=${symbols.join(',')}&feed=iex`),
}

export const WS_KEY    = KEY
export const WS_SECRET = SECRET
