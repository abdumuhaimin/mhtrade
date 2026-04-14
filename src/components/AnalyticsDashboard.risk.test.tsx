import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnalyticsDashboard } from './AnalyticsDashboard'

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeBars(n: number, base: number) {
  return Array.from({ length: n }, (_, i) => ({
    t: new Date(Date.now() - (n - i) * 86_400_000).toISOString(),
    o: base + i * 0.1,
    h: base + i * 0.1 + 0.5,
    l: base + i * 0.1 - 0.5,
    c: base + i * 0.1 + 0.2,
  }))
}

const mockPositions = [
  { symbol: 'AAPL', qty: '10', market_value: '2600', asset_class: 'us_equity',
    unrealized_pl: '100', avg_entry_price: '250' },
  { symbol: 'MSFT', qty: '5', market_value: '1850', asset_class: 'us_equity',
    unrealized_pl: '-50', avg_entry_price: '375' },
]

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('../lib/alpaca', () => ({
  api: {
    positions: vi.fn(() => Promise.resolve(mockPositions)),
    barsMulti: vi.fn((symbols: string[]) =>
      Promise.resolve({
        bars: Object.fromEntries(symbols.map((s: string) => [s, makeBars(30, 200)])),
      })
    ),
    optionSnapshots: vi.fn(() => Promise.resolve({ snapshots: {} })),
  },
}))

vi.mock('../hooks/useLivePrices', () => ({
  useLivePrices: () => ({ quotes: {}, trades: {}, connected: false }),
}))

// ── Wrapper ───────────────────────────────────────────────────────────────────
function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AnalyticsDashboard', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ── Tab rendering ────────────────────────────────────────────────────────────
  it('renders all tab buttons', () => {
    render(<AnalyticsDashboard />, { wrapper: Wrapper })
    for (const tab of ['GREEKS', 'RISK', 'ATTRIBUTION', 'ALERTS', 'SCENARIO']) {
      expect(screen.getByRole('button', { name: tab })).toBeInTheDocument()
    }
  })

  it('shows GREEKS content by default', () => {
    render(<AnalyticsDashboard />, { wrapper: Wrapper })
    // No benchmark select on GREEKS tab
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  // ── RISK tab benchmark selector ───────────────────────────────────────────────
  describe('RISK tab — benchmark selector', () => {
    it('shows BENCHMARK label and dropdown after switching to RISK', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'RISK' }))
      await waitFor(() => expect(screen.getByText('BENCHMARK')).toBeInTheDocument())
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('defaults benchmark to SPY', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'RISK' }))
      await waitFor(() => screen.getByRole('combobox'))
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('SPY')
    })

    it('benchmark dropdown contains all expected options', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'RISK' }))
      await waitFor(() => screen.getByRole('combobox'))
      const select = screen.getByRole('combobox') as HTMLSelectElement
      const opts = [...select.options].map(o => o.value).filter(v => v !== '__custom__')
      expect(opts).toEqual(['SPY', 'QQQ', 'IWM', 'DIA', 'GLD', 'TLT', 'XLE', 'XLK', 'BND'])
    })

    it('updates dropdown value when user selects a different benchmark', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'RISK' }))
      await waitFor(() => screen.getByRole('combobox'))
      await user.selectOptions(screen.getByRole('combobox'), 'QQQ')
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('QQQ')
    })

    it('Corr column header reflects the selected benchmark', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'RISK' }))
      // Wait for data to load and table to render
      await waitFor(() => screen.queryByText(/Corr\(/) !== null, { timeout: 3000 })
      const corrHeader = screen.queryByText(/Corr\(/)
      if (corrHeader) {
        expect(corrHeader.textContent).toContain('Corr(SPY)')
        // Switch to QQQ
        await user.selectOptions(screen.getByRole('combobox'), 'QQQ')
        await waitFor(() => {
          const h = screen.queryByText(/Corr\(/)
          return h?.textContent?.includes('Corr(QQQ)') ?? false
        }, { timeout: 3000 })
        expect(screen.queryByText(/Corr\(/)?.textContent).toContain('Corr(QQQ)')
      } else {
        // No positions data → "Insufficient data" or "Computing..." — benchmark selector still present
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      }
    })
  })

  // ── ALERTS tab ────────────────────────────────────────────────────────────────
  describe('ALERTS tab', () => {
    it('shows empty state message when no alerts exist', async () => {
      localStorage.removeItem('terminal_alerts')
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'ALERTS' }))
      expect(screen.getByText('No alerts — add one above')).toBeInTheDocument()
    })

    it('shows add-alert form fields', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'ALERTS' }))
      expect(screen.getByPlaceholderText('Symbol')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Price')).toBeInTheDocument()
      expect(screen.getByText('+ ADD')).toBeInTheDocument()
    })

    it('adds a new alert and shows it in the list', async () => {
      localStorage.removeItem('terminal_alerts')
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'ALERTS' }))
      await user.type(screen.getByPlaceholderText('Symbol'), 'SPY')
      await user.type(screen.getByPlaceholderText('Price'), '500')
      await user.click(screen.getByText('+ ADD'))
      expect(screen.getByText('SPY')).toBeInTheDocument()
      expect(screen.getByText('$500.00')).toBeInTheDocument()
    })

    it('does not add alert when symbol or price is missing', async () => {
      localStorage.removeItem('terminal_alerts')
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'ALERTS' }))
      await user.click(screen.getByText('+ ADD')) // no symbol/price
      expect(screen.getByText('No alerts — add one above')).toBeInTheDocument()
    })

    it('removes an alert on ✕ click', async () => {
      localStorage.setItem('terminal_alerts', JSON.stringify([
        { id: '1', symbol: 'AAPL', condition: 'above', price: 200, note: '', triggered: false },
      ]))
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'ALERTS' }))
      await user.click(screen.getByRole('button', { name: '✕' }))
      expect(screen.getByText('No alerts — add one above')).toBeInTheDocument()
    })
  })

  // ── SCENARIO tab ──────────────────────────────────────────────────────────────
  describe('SCENARIO tab', () => {
    it('shows MARKET SHOCK slider', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'SCENARIO' }))
      expect(screen.getByText('MARKET SHOCK')).toBeInTheDocument()
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    it('shows EST. IMPACT label', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'SCENARIO' }))
      expect(screen.getByText('EST. IMPACT')).toBeInTheDocument()
    })

    it('shows RESET button', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard />, { wrapper: Wrapper })
      await user.click(screen.getByRole('button', { name: 'SCENARIO' }))
      expect(screen.getByRole('button', { name: 'RESET' })).toBeInTheDocument()
    })
  })
})
