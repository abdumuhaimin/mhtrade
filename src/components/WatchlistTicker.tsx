import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLivePrices } from '../hooks/useLivePrices'
import { useFlash } from '../hooks/useFlash'
import { api } from '../lib/alpaca'

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'NVDA', 'META', 'TSLA', 'AAPL', 'MSFT', 'AVGO', 'TSM', 'PANW']
const LS_KEY = 'mhterm_watchlist'

function loadSymbols(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_SYMBOLS
}

function saveSymbols(syms: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(syms))
}

function TickerCell({ symbol, livePrice, restPrice, onRemove, onSelect }: {
  symbol: string
  livePrice?: number
  restPrice?: number
  onRemove: () => void
  onSelect: () => void
}) {
  const price = livePrice ?? restPrice ?? 0
  const flash = useFlash(price || undefined)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', minWidth: 80, padding: '2px 10px',
        borderRight: '1px solid #1e2229', cursor: 'pointer',
        background: hovered ? '#0f141a' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          onClick={onSelect}
          style={{ fontSize: 9, color: '#5a6070', fontWeight: 700, flex: 1 }}
        >
          {symbol}
        </span>
        {hovered && (
          <span
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            style={{
              fontSize: 9, color: '#444c5c', cursor: 'pointer', lineHeight: 1,
              padding: '0 1px',
              userSelect: 'none',
            }}
            title={`Remove ${symbol}`}
            aria-label={`Remove ${symbol}`}
          >
            ✕
          </span>
        )}
      </div>
      <div onClick={onSelect}>
        {price ? (
          <span
            className={flash ? `flash-${flash}` : 'white'}
            style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.03em' }}
          >
            ${price.toFixed(2)}
          </span>
        ) : (
          <span className="dim" style={{ fontSize: 12 }}>—</span>
        )}
      </div>
    </div>
  )
}

export function WatchlistTicker({ onSelect, onConnected }: {
  onSelect?: (sym: string) => void
  onConnected?: (c: boolean) => void
}) {
  const [symbols, setSymbols] = useState<string[]>(loadSymbols)
  const [adding, setAdding]   = useState(false)
  const [input, setInput]     = useState('')
  const inputRef              = useRef<HTMLInputElement>(null)

  const { quotes, trades, connected } = useLivePrices(symbols)

  const { data: latestData } = useQuery({
    queryKey: ['latestQuotes', symbols.join(',')],
    queryFn: () => api.latestQuote(symbols),
    refetchInterval: 10000,
  })

  useEffect(() => { onConnected?.(connected) }, [connected])

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function addSymbol() {
    const sym = input.trim().toUpperCase()
    if (!sym) { setAdding(false); return }
    if (!symbols.includes(sym)) {
      const next = [...symbols, sym]
      setSymbols(next)
      saveSymbols(next)
    }
    setInput('')
    setAdding(false)
  }

  function removeSymbol(sym: string) {
    const next = symbols.filter(s => s !== sym)
    setSymbols(next)
    saveSymbols(next)
  }

  const getRestPrice = (sym: string): number | undefined => {
    const q = latestData?.quotes?.[sym]
    if (!q) return undefined
    return (q.ap + q.bp) / 2
  }

  const getLivePrice = (sym: string): number | undefined => {
    if (trades[sym]) return trades[sym].p
    if (quotes[sym]) return (quotes[sym].ap + quotes[sym].bp) / 2
    return undefined
  }

  return (
    <div style={{
      background: '#0d1117',
      borderBottom: '1px solid #1e2229',
      display: 'flex',
      alignItems: 'center',
      overflowX: 'auto',
      flexShrink: 0,
      height: 38,
    }}>
      <span style={{
        fontSize: 9, color: '#3a4050', padding: '0 10px',
        letterSpacing: '0.1em', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        WATCHLIST
      </span>

      <div style={{ display: 'flex', height: '100%' }}>
        {symbols.map(sym => (
          <div key={sym} style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <TickerCell
              symbol={sym}
              livePrice={getLivePrice(sym)}
              restPrice={getRestPrice(sym)}
              onSelect={() => onSelect?.(sym)}
              onRemove={() => removeSymbol(sym)}
            />
          </div>
        ))}
      </div>

      {/* Add symbol */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 6px' }}>
        {adding ? (
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => {
              if (e.key === 'Enter') addSymbol()
              if (e.key === 'Escape') { setAdding(false); setInput('') }
            }}
            onBlur={addSymbol}
            placeholder="TICKER"
            maxLength={10}
            style={{
              background: '#0f141a',
              border: '1px solid #2a3040',
              color: '#c8cdd6',
              fontSize: 10,
              fontFamily: 'inherit',
              padding: '2px 6px',
              width: 70,
              outline: 'none',
              borderRadius: 3,
              letterSpacing: '0.05em',
            }}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            title="Add symbol"
            style={{
              background: 'none',
              border: '1px solid #2a3040',
              color: '#4a5568',
              fontSize: 14,
              lineHeight: 1,
              cursor: 'pointer',
              padding: '1px 6px',
              borderRadius: 3,
              display: 'flex', alignItems: 'center',
            }}
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}
