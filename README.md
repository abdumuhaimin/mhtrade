# MHTerm — Professional Trading Terminal

A Bloomberg-style trading terminal built on React + TypeScript, connected to Alpaca Markets paper trading. Real-time WebSocket prices, candlestick charts, options Greeks, and a full analytics suite — all in the browser.

**Live:** [terminal-green-beta.vercel.app](https://terminal-green-beta.vercel.app)

---

## Features

### Real-Time Market Data
- **Live WebSocket feed** via Alpaca IEX stream — bid/ask, last trade, size
- **Watchlist ticker** — SPY, QQQ, NVDA, META, TSLA, AAPL, MSFT, AVGO, TSM, PANW with flash-on-change price updates
- **Singleton WebSocket** — one shared connection across all components, respects Alpaca's free-tier 1-connection limit

### Price Chart
- **Candlestick chart** powered by lightweight-charts v5
- **Live candle updates** — last bar close tracks WebSocket price tick by tick
- **Timeframes** — 1Min / 5Min / 15Min / 1H / 1D
- **Sanity guard** — rejects bad prints (>30% deviation) to prevent chart corruption

### Positions Book
- Stocks and options split into separate sections
- **Live price flashing** — green/red flash on each price change
- Option symbols displayed in readable format (`TSLA 310P 04/24` instead of `TSLA260424P00310000`)
- Fixed-layout columns — no horizontal scroll

### Analytics Dashboard (5 tabs)

| Tab | What it shows |
|---|---|
| **Greeks** | Per-contract Δ Delta, Γ Gamma, Θ Theta, ν Vega, IV%, Bid/Ask, P&L |
| **Risk** | Portfolio β, 95% VaR, CVaR in % and $, per-position beta/correlation to SPY |
| **Attribution** | P&L by sector, stocks vs options split, top 3 winners/losers |
| **Alerts** | Price alerts (above/below), persisted in localStorage, highlights on trigger |
| **Scenario** | Market shock slider (±30%), delta-gamma approximation for options, per-position override |

### Other Panels
- **Portfolio equity curve** — Recharts area chart with 1W/1M/3M/1Y periods
- **Orders panel** — Open and Recent tabs, colour-coded by status
- **Header** — live portfolio value, day P&L, cash, options buying power, Singapore + New York clocks, WebSocket status dot

### Layout
- All panels are **drag-to-resize** — horizontal between columns, vertical within columns
- Sizes initialise relative to viewport — works at any resolution

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Charts | lightweight-charts v5, Recharts |
| Data fetching | TanStack React Query |
| Styling | Tailwind CSS v4 + CSS-in-JS |
| Broker API | Alpaca Markets (paper trading) |
| Testing | Vitest — 42 tests |
| Deployment | Vercel |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/abdumuhaimin/mhtrade
cd mhtrade
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Alpaca paper trading credentials:

```env
VITE_ALPACA_KEY=your_key_here
VITE_ALPACA_SECRET=your_secret_here
VITE_ALPACA_BASE=/alpaca-trade
VITE_ALPACA_DATA=/alpaca-data
```

Get your keys from [alpaca.markets](https://alpaca.markets) → Paper Trading → API Keys.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Testing

```bash
npm test
```

42 unit tests covering:
- `analytics.ts` — `dailyReturns`, `calcBeta`, `calcCorrelation`, `calcVaR`, `calcCVaR`, `calcPortfolioReturns`
- `sectors.ts` — sector lookup, option symbol stripping
- Price safety guard — `??` vs `||` bug, ±30% sanity check

---

## Deployment

The repo is connected to Vercel. Every push to `main` deploys automatically.

To deploy manually:

```bash
vercel --prod
```

The `vercel.json` proxies `/alpaca-trade/*` and `/alpaca-data/*` to Alpaca's servers, so the same `VITE_ALPACA_BASE`/`VITE_ALPACA_DATA` env vars work in both dev and production.

> **Note:** Alpaca API keys are embedded in the client bundle (standard for single-user personal terminals). Do not use live trading credentials.

---

## Project Structure

```
src/
├── components/
│   ├── AnalyticsDashboard.tsx  # 5-tab analytics panel
│   ├── Header.tsx              # Top bar with account stats + clocks
│   ├── OptionsGreeks.tsx       # Greeks table (also used in Analytics)
│   ├── OrdersPanel.tsx         # Open / recent orders
│   ├── PortfolioChart.tsx      # Equity curve
│   ├── PositionsBook.tsx       # Live positions table
│   ├── PriceChart.tsx          # Candlestick chart with live updates
│   └── WatchlistTicker.tsx     # Scrolling watchlist bar
├── hooks/
│   ├── useFlash.ts             # Price flash animation hook
│   ├── useLivePrices.ts        # WebSocket price hook
│   └── useResize.ts            # Drag-to-resize hook
└── lib/
    ├── alpaca.ts               # Alpaca REST API client
    ├── analytics.ts            # Beta, VaR, CVaR, correlation math
    ├── sectors.ts              # Symbol → sector mapping
    └── wsStore.ts              # WebSocket singleton store
```

---

## License

MIT
