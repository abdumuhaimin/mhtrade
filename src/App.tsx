import { useState } from 'react'
import { Header } from './components/Header'
import { WatchlistTicker } from './components/WatchlistTicker'
import { PositionsBook } from './components/PositionsBook'
import { PriceChart } from './components/PriceChart'
import { PortfolioChart } from './components/PortfolioChart'
import { OrdersPanel } from './components/OrdersPanel'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import { useResize } from './hooks/useResize'

// ── Drag handle components ────────────────────────────────────────────────────
function HDivider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{ width: 5, cursor: 'col-resize', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
      className="resize-divider"
    >
      <div style={{ width: 2, height: 32, borderRadius: 2, background: '#1e2229', transition: 'background 0.15s' }} className="resize-handle-bar" />
    </div>
  )
}

function VDivider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{ height: 5, cursor: 'row-resize', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
      className="resize-divider"
    >
      <div style={{ height: 2, width: 32, borderRadius: 2, background: '#1e2229', transition: 'background 0.15s' }} className="resize-handle-bar" />
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [wsConnected, setWsConnected] = useState(false)
  const [chartSymbol, setChartSymbol] = useState('SPY')

  // Column widths (px) — initialised relative to viewport so they work at any screen size
  const [leftW,  setLeftW]  = useState(() => Math.max(260, Math.round(window.innerWidth * 0.22)))
  const [rightW, setRightW] = useState(() => Math.max(200, Math.round(window.innerWidth * 0.22)))

  // Row heights within columns (fraction 0–1, applied as flex)
  const [leftTopFlex,    setLeftTopFlex]    = useState(0.75)
  const [centerTopFlex,  setCenterTopFlex]  = useState(0.55)

  const dragLeft   = useResize(setLeftW,  'horizontal', 220, 600)
  const dragRight  = useResize(setRightW, 'horizontal', 180, 500, true)

  const dragLeftRow  = useResize((fn) => setLeftTopFlex(prev => {
    const container = document.querySelector('[data-left-col]') as HTMLElement
    if (!container) return prev
    const total = container.offsetHeight
    const newPx = fn(prev * total)
    return Math.min(0.88, Math.max(0.20, newPx / total))
  }), 'vertical', 80)

  const dragCenterRow = useResize((fn) => setCenterTopFlex(prev => {
    const container = document.querySelector('[data-center-col]') as HTMLElement
    if (!container) return prev
    const total = container.offsetHeight
    const newPx = fn(prev * total)
    return Math.min(0.88, Math.max(0.15, newPx / total))
  }), 'vertical', 80)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header wsConnected={wsConnected} />
      <WatchlistTicker onSelect={setChartSymbol} onConnected={setWsConnected} />

      <div style={{ flex: 1, display: 'flex', padding: 4, minHeight: 0, overflow: 'hidden' }}>

        {/* Left column */}
        <div data-left-col style={{ display: 'flex', flexDirection: 'column', width: leftW, flexShrink: 0, minHeight: 0 }}>
          <div style={{ flex: leftTopFlex, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PositionsBook />
          </div>
          <VDivider onMouseDown={dragLeftRow} />
          <div style={{ flex: 1 - leftTopFlex, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <OrdersPanel />
          </div>
        </div>

        <HDivider onMouseDown={dragLeft} />

        {/* Center column */}
        <div data-center-col style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
          <div style={{ flex: centerTopFlex, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PriceChart symbol={chartSymbol} />
          </div>
          <VDivider onMouseDown={dragCenterRow} />
          <div style={{ flex: 1 - centerTopFlex, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <AnalyticsDashboard />
          </div>
        </div>

        <HDivider onMouseDown={dragRight} />

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', width: rightW, flexShrink: 0, minHeight: 0 }}>
          <PortfolioChart />
        </div>

      </div>
    </div>
  )
}
