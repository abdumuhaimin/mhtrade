import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/alpaca'
import { useLivePrices } from '../hooks/useLivePrices'

const TIMEFRAMES = ['1Min', '5Min', '15Min', '1H', '1D'] as const
type TF = typeof TIMEFRAMES[number]

const TF_MAP: Record<TF, { timeframe: string; limit: number }> = {
  '1Min':  { timeframe: '1Min',  limit: 200 },
  '5Min':  { timeframe: '5Min',  limit: 200 },
  '15Min': { timeframe: '15Min', limit: 200 },
  '1H':    { timeframe: '1Hour', limit: 200 },
  '1D':    { timeframe: '1Day',  limit: 100 },
}

export function PriceChart({ symbol }: { symbol: string }) {
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const chartRef      = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef     = useRef<any>(null)
  const lastBarRef    = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null)
  const latestPriceRef = useRef<number | null>(null)
  const [tf, setTf]   = useState<TF>('1D')
  const [ready, setReady] = useState(false)

  const { trades, quotes } = useLivePrices([symbol])

  // Reset refs when symbol changes
  useEffect(() => { lastBarRef.current = null; latestPriceRef.current = null }, [symbol])

  const { data: barsData, error: barsError, isLoading: barsLoading } = useQuery({
    queryKey: ['bars', symbol, tf],
    queryFn: () => api.bars(symbol, TF_MAP[tf].timeframe),
    refetchInterval: tf === '1D' ? 60000 : 15000,
    enabled: !!symbol,
    retry: 1,
  })

  // Use ResizeObserver to detect when the wrapper has real dimensions, then init chart
  const initChart = useCallback((el: HTMLDivElement) => {
    if (chartRef.current) return  // already initialized
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#111318' },
        textColor: '#5a6070',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#1a1e26' },
        horzLines: { color: '#1a1e26' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#1e2229' },
      timeScale: { borderColor: '#1e2229', timeVisible: true, secondsVisible: false },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor:          '#00e676',
      downColor:        '#ff3d57',
      borderUpColor:    '#00e676',
      borderDownColor:  '#ff3d57',
      wickUpColor:      '#00e676',
      wickDownColor:    '#ff3d57',
    })
    chartRef.current  = chart
    seriesRef.current = series
    setReady(true)
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0 && !chartRef.current) {
        initChart(el)
      }
    })
    ro.observe(el)

    // Also try immediately in case dimensions are already set
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      initChart(el)
    }

    return () => {
      ro.disconnect()
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current  = null
        seriesRef.current = null
      }
    }
  }, [initChart])

  // Feed historical bars
  useEffect(() => {
    if (!ready || !seriesRef.current || !barsData) return
    // single-symbol endpoint: { bars: [...] }  multi-symbol: { bars: { SYM: [...] } }
    const raw = barsData?.bars
    const bars: any[] = Array.isArray(raw) ? raw : (raw?.[symbol] ?? [])
    const candles = bars.map((b: any) => ({
      time:  Math.floor(new Date(b.t).getTime() / 1000) as any,
      open:  b.o,
      high:  b.h,
      low:   b.l,
      close: b.c,
    }))
    if (candles.length) {
      seriesRef.current.setData(candles)
      chartRef.current?.timeScale().fitContent()
      const last = candles[candles.length - 1]
      // Re-apply latest live price so a barsData refresh doesn't revert the candle
      if (latestPriceRef.current) {
        const p = latestPriceRef.current
        const updated = { ...last, high: Math.max(last.high, p), low: Math.min(last.low, p), close: p }
        seriesRef.current.update({ ...updated, time: updated.time as any })
        lastBarRef.current = updated
      } else {
        lastBarRef.current = last
      }
    }
  }, [barsData, symbol, ready])

  // Update last candle with live price
  useEffect(() => {
    if (!ready || !seriesRef.current || !lastBarRef.current) return
    const trade = trades[symbol]
    const quote = quotes[symbol]
    const mid = quote?.ap && quote?.bp
      ? (quote.ap + quote.bp) / 2
      : (quote?.ap || quote?.bp) || 0
    const livePrice = trade?.p || mid
    if (!livePrice || livePrice <= 0) return

    // Sanity check: reject prices >30% away from bar close (bad prints / zero quotes)
    const last = lastBarRef.current
    const ref = last.close || last.open
    if (ref > 0 && (livePrice < ref * 0.7 || livePrice > ref * 1.3)) return

    latestPriceRef.current = livePrice

    const bar = {
      time:  last.time,
      open:  last.open,
      high:  Math.max(last.high, livePrice),
      low:   last.low,   // never update low from live ticks — Math.min with bad data corrupts permanently
      close: livePrice,
    }
    lastBarRef.current = bar
    seriesRef.current.update({ ...bar, time: bar.time as any })
  }, [trades[symbol], quotes[symbol], ready])

  return (
    <div className="panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span style={{ color: '#e8ecf4', fontWeight: 800 }}>{symbol}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {TIMEFRAMES.map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              style={{
                background: tf === t ? '#2979ff20' : 'transparent',
                border: `1px solid ${tf === t ? '#2979ff' : '#1e2229'}`,
                color: tf === t ? '#2979ff' : '#5a6070',
                fontSize: 9,
                padding: '2px 6px',
                cursor: 'pointer',
                borderRadius: 2,
                letterSpacing: '0.05em',
                fontFamily: 'inherit',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {barsError ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff3d57', fontSize: 11, padding: 12, textAlign: 'center' }}>
          {String((barsError as any)?.message ?? barsError)}
        </div>
      ) : barsLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a6070', fontSize: 11 }}>
          Loading…
        </div>
      ) : null}
      <div ref={wrapperRef} style={{ flex: 1, minHeight: 0, display: barsError ? 'none' : undefined }} />
    </div>
  )
}
