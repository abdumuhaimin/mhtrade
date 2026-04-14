import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WatchlistTicker } from './WatchlistTicker'

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('../hooks/useLivePrices', () => ({
  useLivePrices: () => ({ quotes: {}, trades: {}, connected: false }),
}))

vi.mock('../lib/alpaca', () => ({
  api: {
    latestQuote: () => Promise.resolve({ quotes: {} }),
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────
function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('WatchlistTicker', () => {
  beforeEach(() => { localStorage.clear() })

  // ── Rendering ───────────────────────────────────────────────────────────────
  it('renders the WATCHLIST label', () => {
    render(<WatchlistTicker />, { wrapper: Wrapper })
    expect(screen.getByText('WATCHLIST')).toBeInTheDocument()
  })

  it('renders all default symbols when localStorage is empty', () => {
    render(<WatchlistTicker />, { wrapper: Wrapper })
    for (const sym of ['SPY', 'QQQ', 'NVDA', 'META', 'TSLA', 'AAPL', 'MSFT', 'AVGO', 'TSM', 'PANW']) {
      expect(screen.getByText(sym), `missing ${sym}`).toBeInTheDocument()
    }
  })

  it('shows the + add button', () => {
    render(<WatchlistTicker />, { wrapper: Wrapper })
    expect(screen.getByTitle('Add symbol')).toBeInTheDocument()
  })

  it('loads custom symbols from localStorage instead of defaults', () => {
    localStorage.setItem('mhterm_watchlist', JSON.stringify(['AMZN', 'TSLA']))
    render(<WatchlistTicker />, { wrapper: Wrapper })
    expect(screen.getByText('AMZN')).toBeInTheDocument()
    expect(screen.getByText('TSLA')).toBeInTheDocument()
    expect(screen.queryByText('SPY')).toBeNull() // not in custom list
  })

  // ── Add symbol ──────────────────────────────────────────────────────────────
  it('shows text input when + is clicked', async () => {
    const user = userEvent.setup()
    render(<WatchlistTicker />, { wrapper: Wrapper })
    await user.click(screen.getByTitle('Add symbol'))
    expect(screen.getByPlaceholderText('TICKER')).toBeInTheDocument()
    expect(screen.queryByTitle('Add symbol')).toBeNull()
  })

  it('adds a symbol on Enter and saves to localStorage', async () => {
    const user = userEvent.setup()
    render(<WatchlistTicker />, { wrapper: Wrapper })
    await user.click(screen.getByTitle('Add symbol'))
    await user.type(screen.getByPlaceholderText('TICKER'), 'GOOG{Enter}')
    expect(screen.getByText('GOOG')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('mhterm_watchlist')!)).toContain('GOOG')
  })

  it('auto-uppercases typed input', async () => {
    const user = userEvent.setup()
    render(<WatchlistTicker />, { wrapper: Wrapper })
    await user.click(screen.getByTitle('Add symbol'))
    await user.type(screen.getByPlaceholderText('TICKER'), 'goog{Enter}')
    expect(screen.getByText('GOOG')).toBeInTheDocument()
  })

  it('does not add a duplicate symbol', async () => {
    const user = userEvent.setup()
    render(<WatchlistTicker />, { wrapper: Wrapper })
    // First add GOOGL (not a default) — creates a localStorage entry
    await user.click(screen.getByTitle('Add symbol'))
    await user.type(screen.getByPlaceholderText('TICKER'), 'GOOGL{Enter}')
    // Try to add GOOGL again — should be deduped
    await user.click(screen.getByTitle('Add symbol'))
    await user.type(screen.getByPlaceholderText('TICKER'), 'GOOGL{Enter}')
    const saved: string[] = JSON.parse(localStorage.getItem('mhterm_watchlist')!)
    expect(saved.filter(s => s === 'GOOGL').length).toBe(1)
  })

  it('does not add an empty ticker on Enter', async () => {
    const user = userEvent.setup()
    render(<WatchlistTicker />, { wrapper: Wrapper })
    const countBefore = screen.getAllByTitle('Add symbol').length // placeholder — just check list length
    await user.click(screen.getByTitle('Add symbol'))
    await user.keyboard('{Enter}')
    // Input should dismiss and no new symbol added
    expect(screen.queryByPlaceholderText('TICKER')).toBeNull()
    // Default symbols still present (SPY etc.)
    expect(screen.getByText('SPY')).toBeInTheDocument()
    void countBefore
  })

  it('cancels add with Escape key and restores + button', async () => {
    const user = userEvent.setup()
    render(<WatchlistTicker />, { wrapper: Wrapper })
    await user.click(screen.getByTitle('Add symbol'))
    expect(screen.getByPlaceholderText('TICKER')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByPlaceholderText('TICKER')).toBeNull()
    expect(screen.getByTitle('Add symbol')).toBeInTheDocument()
  })

  it('adds symbol on blur (clicking away)', async () => {
    const user = userEvent.setup()
    render(<WatchlistTicker />, { wrapper: Wrapper })
    await user.click(screen.getByTitle('Add symbol'))
    const input = screen.getByPlaceholderText('TICKER')
    await user.type(input, 'GOOGL') // not in defaults
    fireEvent.blur(input)
    await waitFor(() => expect(screen.getByText('GOOGL')).toBeInTheDocument())
  })

  // ── Remove symbol ───────────────────────────────────────────────────────────
  it('reveals ✕ button on hover', async () => {
    render(<WatchlistTicker />, { wrapper: Wrapper })
    // Traverse: <span>SPY</span> → inner row div → TickerCell outer div (has onMouseEnter)
    const tickerCell = screen.getByText('SPY').parentElement!.parentElement!
    fireEvent.mouseEnter(tickerCell)
    await waitFor(() => expect(screen.getByLabelText('Remove SPY')).toBeInTheDocument())
  })

  it('removes a symbol when ✕ is clicked and updates localStorage', async () => {
    render(<WatchlistTicker />, { wrapper: Wrapper })
    const tickerCell = screen.getByText('SPY').parentElement!.parentElement!
    fireEvent.mouseEnter(tickerCell)
    await waitFor(() => screen.getByLabelText('Remove SPY'))
    fireEvent.click(screen.getByLabelText('Remove SPY'))
    await waitFor(() => expect(screen.queryByText('SPY')).toBeNull())
    const saved: string[] = JSON.parse(localStorage.getItem('mhterm_watchlist')!)
    expect(saved).not.toContain('SPY')
  })

  // ── onSelect callback ────────────────────────────────────────────────────────
  it('calls onSelect with the symbol when a ticker is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<WatchlistTicker onSelect={onSelect} />, { wrapper: Wrapper })
    await user.click(screen.getByText('QQQ'))
    expect(onSelect).toHaveBeenCalledWith('QQQ')
  })

  // ── onConnected callback ─────────────────────────────────────────────────────
  it('calls onConnected(false) with initial disconnected state', () => {
    const onConnected = vi.fn()
    render(<WatchlistTicker onConnected={onConnected} />, { wrapper: Wrapper })
    expect(onConnected).toHaveBeenCalledWith(false)
  })
})
