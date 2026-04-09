import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/alpaca'
import { useLivePrices } from '../hooks/useLivePrices'
import { useFlash } from '../hooks/useFlash'

type Position = {
  symbol: string
  qty: string
  side: string
  avg_entry_price: string
  current_price: string
  market_value: string
  unrealized_pl: string
  unrealized_plpc: string
  asset_class: string
  cost_basis: string
}

function PriceCell({ price }: { price: number; symbol: string }) {
  const flash = useFlash(price)
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <span className={flash ? `flash-${flash}` : ''}>
      ${fmt(price)}
    </span>
  )
}

// TSLA260424P00310000 → TSLA 310P 4/24
function abbreviateOption(sym: string): string {
  const m = sym.match(/^([A-Z]+)(\d{2})(\d{2})(\d{2})([CP])(\d+)$/)
  if (!m) return sym
  const [, under, , mm, dd, type, strikeRaw] = m
  const strike = parseInt(strikeRaw) / 1000
  const strikeStr = strike % 1 === 0 ? strike.toFixed(0) : strike.toFixed(1)
  return `${under} ${strikeStr}${type} ${mm}/${dd}`
}

function PositionRow({ pos, livePrice }: { pos: Position; livePrice?: number }) {
  const entry  = parseFloat(pos.avg_entry_price)
  const qty    = parseFloat(pos.qty)
  const live   = livePrice ?? parseFloat(pos.current_price)
  const mv     = live * qty
  const pnl    = (live - entry) * qty
  const pnlPct = entry ? ((live - entry) / entry) * 100 : 0

  const fmt  = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtK = (n: number) => Math.abs(n) >= 1000 ? `${(n/1000).toFixed(2)}K` : fmt(n)

  const pnlCls = pnl >= 0 ? 'up' : 'down'

  const isOption = pos.asset_class === 'us_option'
  const displaySym = isOption ? abbreviateOption(pos.symbol) : pos.symbol

  return (
    <tr>
      <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ fontWeight: 700, color: '#e8ecf4' }} title={pos.symbol}>{displaySym}</span>
      </td>
      <td className="white" style={{ padding: '3px 4px' }}>{qty > 0 ? qty : Math.abs(qty)}</td>
      <td className="dim" style={{ padding: '3px 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>${fmt(entry)}</td>
      <td style={{ padding: '3px 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}><PriceCell price={live} symbol={pos.symbol} /></td>
      <td className="white" style={{ padding: '3px 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>${fmtK(mv)}</td>
      <td className={pnlCls} style={{ padding: '3px 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {pnl >= 0 ? '+' : ''}${fmtK(pnl)}
      </td>
      <td className={pnlCls} style={{ padding: '3px 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
      </td>
    </tr>
  )
}

export function PositionsBook() {
  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ['positions'],
    queryFn: api.positions,
    refetchInterval: 10000,
  })

  const stockSymbols = positions
    .filter(p => p.asset_class !== 'us_option')
    .map(p => p.symbol)

  const { quotes, trades } = useLivePrices(stockSymbols)

  const stocks  = positions.filter(p => p.asset_class !== 'us_option')
  const options = positions.filter(p => p.asset_class === 'us_option')

  const totalMV  = positions.reduce((s, p) => s + parseFloat(p.market_value), 0)
  const totalPnl = positions.reduce((s, p) => s + parseFloat(p.unrealized_pl), 0)
  const pnlCls   = totalPnl >= 0 ? 'up' : 'down'

  const fmt  = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtK = (n: number) => Math.abs(n) >= 1000 ? `${(n/1000).toFixed(2)}K` : fmt(n)

  const getLivePrice = (sym: string) => {
    if (trades[sym]) return trades[sym].p
    if (quotes[sym]) return (quotes[sym].ap + quotes[sym].bp) / 2
    return undefined
  }

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header">
        <span>Positions</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="dim">{positions.length} pos</span>
          <span className="dim">MV ${fmtK(totalMV)}</span>
          <span className={pnlCls}>
            {totalPnl >= 0 ? '+' : ''}${fmtK(totalPnl)} P&L
          </span>
        </div>
      </div>
      <div className="panel-body">
        {positions.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#3a4050' }}>No open positions</div>
        ) : (
          <table style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Symbol</th>
                <th style={{ padding: '4px 4px' }}>Qty</th>
                <th style={{ padding: '4px 4px' }}>Entry</th>
                <th style={{ padding: '4px 4px' }}>Live</th>
                <th style={{ padding: '4px 4px' }}>MktVal</th>
                <th style={{ padding: '4px 4px' }}>P&L$</th>
                <th style={{ padding: '4px 4px' }}>P&L%</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(p => (
                <PositionRow key={p.symbol} pos={p} livePrice={getLivePrice(p.symbol)} />
              ))}
              {options.length > 0 && stocks.length > 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '4px 8px', fontSize: 9, color: '#3a4050', letterSpacing: '0.1em' }}>
                    OPTIONS
                  </td>
                </tr>
              )}
              {options.map(p => (
                <PositionRow key={p.symbol} pos={p} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
