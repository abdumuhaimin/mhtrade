import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLivePrices } from '../hooks/useLivePrices'
import { useFlash } from '../hooks/useFlash'
import { api } from '../lib/alpaca'

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'NVDA', 'META', 'TSLA', 'AAPL', 'MSFT', 'AVGO', 'TSM', 'PANW']

function TickerCell({ symbol, livePrice, restPrice }: {
  symbol: string
  livePrice?: number
  restPrice?: number
}) {
  const price = livePrice ?? restPrice ?? 0
  const flash = useFlash(price || undefined)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minWidth: 80, padding: '2px 10px',
      borderRight: '1px solid #1e2229', cursor: 'pointer',
    }}>
      <span style={{ fontSize: 9, color: '#5a6070', fontWeight: 700 }}>{symbol}</span>
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
  )
}

export function WatchlistTicker({ onSelect, onConnected }: {
  onSelect?: (sym: string) => void
  onConnected?: (c: boolean) => void
}) {
  const symbols = DEFAULT_SYMBOLS
  const { quotes, trades, connected } = useLivePrices(symbols)

  // Seed with REST latest quotes (refreshes every 10s)
  const { data: latestData } = useQuery({
    queryKey: ['latestQuotes', symbols.join(',')],
    queryFn: () => api.latestQuote(symbols),
    refetchInterval: 10000,
  })

  useEffect(() => { onConnected?.(connected) }, [connected])

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
          <div
            key={sym}
            onClick={() => onSelect?.(sym)}
            style={{ height: '100%', display: 'flex', alignItems: 'center' }}
          >
            <TickerCell
              symbol={sym}
              livePrice={getLivePrice(sym)}
              restPrice={getRestPrice(sym)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
