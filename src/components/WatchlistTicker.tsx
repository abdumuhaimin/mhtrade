import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLivePrices } from '../hooks/useLivePrices'
import { useFlash } from '../hooks/useFlash'
import { api } from '../lib/alpaca'

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'NVDA', 'META', 'TSLA', 'AAPL', 'MSFT', 'AVGO', 'TSM', 'PANW']
const LS_KEY          = 'mhterm_watchlist'
const LS_ALERTS_KEY   = 'mhterm_alerts'

type AlertEntry = { sym: string; price: number; direction: 'above' | 'below' }

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

function loadAlerts(): AlertEntry[] {
  try {
    const raw = localStorage.getItem(LS_ALERTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveAlerts(alerts: AlertEntry[]) {
  localStorage.setItem(LS_ALERTS_KEY, JSON.stringify(alerts))
}

function TickerCell({ symbol, livePrice, restPrice, prevClose, hasAlert, onRemove, onSelect, onAlertClick }: {
  symbol: string
  livePrice?: number
  restPrice?: number
  prevClose?: number | null
  hasAlert: boolean
  onRemove: () => void
  onSelect: () => void
  onAlertClick: () => void
}) {
  const price = livePrice ?? restPrice ?? 0
  const flash = useFlash(price || undefined)
  const [hovered, setHovered] = useState(false)

  const chg    = (prevClose && price) ? price - prevClose : null
  const chgPct = (prevClose && price) ? ((price - prevClose) / prevClose) * 100 : null
  const isUp   = (chgPct ?? 0) >= 0

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
      {/* Row 1: symbol + action icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          onClick={onSelect}
          style={{
            fontSize: 9, fontWeight: 700, flex: 1,
            color: chgPct == null ? '#5a6070' : isUp ? '#00e676' : '#ff3d57',
          }}
        >
          {symbol}
        </span>
        {(hovered || hasAlert) && (
          <span
            onClick={(e) => { e.stopPropagation(); onAlertClick() }}
            title={hasAlert ? 'Alert set — click to clear' : `Set alert for ${symbol}`}
            style={{
              fontSize: 9,
              color: hasAlert ? '#ffaa00' : '#444c5c',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 1px',
              userSelect: 'none',
            }}
          >
            {hasAlert ? '⚑' : '⚐'}
          </span>
        )}
        {hovered && (
          <span
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            style={{
              fontSize: 9, color: '#444c5c', cursor: 'pointer', lineHeight: 1,
              padding: '0 1px', userSelect: 'none',
            }}
            title={`Remove ${symbol}`}
          >
            ✕
          </span>
        )}
      </div>

      {/* Row 2: price */}
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

      {/* Row 3: day change */}
      {chgPct != null && (
        <div onClick={onSelect} style={{ fontSize: 9, color: isUp ? '#00e676' : '#ff3d57' }}>
          {isUp ? '+' : ''}{chgPct.toFixed(2)}%
          <span style={{ color: '#3a4050', marginLeft: 3 }}>
            {isUp ? '+' : ''}{chg!.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Alert modal ───────────────────────────────────────────────────────────────
function AlertModal({ sym, existing, onSet, onClear, onClose }: {
  sym: string
  existing?: AlertEntry
  onSet: (price: number, direction: 'above' | 'below') => void
  onClear: () => void
  onClose: () => void
}) {
  const [price, setPrice]         = useState(existing?.price.toString() ?? '')
  const [direction, setDirection] = useState<'above' | 'below'>(existing?.direction ?? 'above')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const btnBase: React.CSSProperties = {
    background: 'none', border: '1px solid #1e2229', color: '#5a6070',
    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px',
    cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit',
  }
  const btnActive: React.CSSProperties = { ...btnBase, borderColor: '#2979ff', color: '#2979ff', background: '#2979ff15' }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 48, left: '50%', transform: 'translateX(-50%)',
        background: '#0d1117', border: '1px solid #2979ff40', borderRadius: 4,
        padding: '10px 14px', zIndex: 1000, minWidth: 220,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ fontSize: 9, color: '#3a4050', letterSpacing: '0.12em' }}>PRICE ALERT — {sym}</div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#5a6070' }}>$</span>
          <input
            ref={inputRef}
            value={price}
            onChange={e => setPrice(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { const n = parseFloat(price); if (n > 0) onSet(n, direction) }
              if (e.key === 'Escape') onClose()
            }}
            placeholder="0.00"
            style={{
              background: '#0a0c0f', border: '1px solid #1e2229', color: '#c8cdd8',
              fontSize: 12, padding: '3px 6px', borderRadius: 2, fontFamily: 'inherit',
              outline: 'none', width: 80,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button style={direction === 'above' ? btnActive : btnBase} onClick={() => setDirection('above')}>▲ ABOVE</button>
          <button style={direction === 'below' ? btnActive : btnBase} onClick={() => setDirection('below')}>▼ BELOW</button>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => { const n = parseFloat(price); if (n > 0) onSet(n, direction) }}
            style={{ ...btnBase, flex: 1, borderColor: '#2979ff', color: '#2979ff', background: '#2979ff10' }}
          >
            SET ALERT
          </button>
          {existing && (
            <button onClick={onClear} style={{ ...btnBase, borderColor: '#ff3d57', color: '#ff3d57' }}>CLEAR</button>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function WatchlistTicker({ onSelect, onConnected }: {
  onSelect?: (sym: string) => void
  onConnected?: (c: boolean) => void
}) {
  const [symbols, setSymbols]   = useState<string[]>(loadSymbols)
  const [adding, setAdding]     = useState(false)
  const [input, setInput]       = useState('')
  const [alerts, setAlerts]     = useState<AlertEntry[]>(loadAlerts)
  const [alertModal, setAlertModal] = useState<string | null>(null)  // sym being edited
  const inputRef = useRef<HTMLInputElement>(null)

  const { quotes, trades, connected } = useLivePrices(symbols)

  const { data: latestData } = useQuery({
    queryKey: ['latestQuotes', symbols.join(',')],
    queryFn: () => api.latestQuote(symbols),
    refetchInterval: 10000,
  })

  const { data: prevCloseData } = useQuery({
    queryKey: ['prevClose', symbols.join(',')],
    queryFn: () => api.prevClose(symbols),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => { onConnected?.(connected) }, [connected])

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  // ── Price alert checker ───────────────────────────────────────────────────
  useEffect(() => {
    if (!alerts.length) return
    const triggered: AlertEntry[] = []
    for (const alert of alerts) {
      const price = getLivePrice(alert.sym) ?? getRestPrice(alert.sym)
      if (!price) continue
      const hit = alert.direction === 'above' ? price >= alert.price : price <= alert.price
      if (!hit) continue
      triggered.push(alert)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${alert.sym} Alert`, {
          body: `${alert.sym} hit $${alert.price.toFixed(2)} (${alert.direction})`,
          tag: `mhterm-${alert.sym}`,
        })
      }
    }
    if (triggered.length) {
      const remaining = alerts.filter(a => !triggered.includes(a))
      setAlerts(remaining)
      saveAlerts(remaining)
    }
  }, [JSON.stringify(quotes), JSON.stringify(trades)])

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

  function setAlert(sym: string, price: number, direction: 'above' | 'below') {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    const next = [...alerts.filter(a => a.sym !== sym), { sym, price, direction }]
    setAlerts(next)
    saveAlerts(next)
    setAlertModal(null)
  }

  function clearAlert(sym: string) {
    const next = alerts.filter(a => a.sym !== sym)
    setAlerts(next)
    saveAlerts(next)
    setAlertModal(null)
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
      height: 48,
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
              prevClose={prevCloseData?.[sym]}
              hasAlert={alerts.some(a => a.sym === sym)}
              onSelect={() => onSelect?.(sym)}
              onRemove={() => removeSymbol(sym)}
              onAlertClick={() => setAlertModal(sym)}
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

      {/* Alert modal */}
      {alertModal && (
        <AlertModal
          sym={alertModal}
          existing={alerts.find(a => a.sym === alertModal)}
          onSet={(price, dir) => setAlert(alertModal, price, dir)}
          onClear={() => clearAlert(alertModal)}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  )
}
