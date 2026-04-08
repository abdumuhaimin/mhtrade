import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/alpaca'

function parseOptionSymbol(sym: string): { underlying: string; expiry: string; optType: string; strike: number } {
  try {
    const underlying = sym.replace(/\d.*/, '')
    const rest = sym.slice(underlying.length)
    const date = rest.slice(0, 6)
    const optType = rest[6]
    const strike = parseInt(rest.slice(7)) / 1000
    const expiry = `20${date.slice(0, 2)}-${date.slice(2, 4)}-${date.slice(4, 6)}`
    return { underlying, expiry, optType, strike }
  } catch {
    return { underlying: sym, expiry: '', optType: '', strike: 0 }
  }
}

export function OptionsGreeks() {
  const { data: positions = [] } = useQuery<any[]>({
    queryKey: ['positions'],
    queryFn: api.positions,
    refetchInterval: 30000,
  })

  const optionPositions = positions.filter((p: any) => p.asset_class === 'us_option')
  const contractSymbols = optionPositions.map((p: any) => p.symbol)

  const { data: snapshotData } = useQuery({
    queryKey: ['optionSnapshots', contractSymbols.join(',')],
    queryFn: () => api.optionSnapshots(contractSymbols),
    refetchInterval: 15000,
    enabled: contractSymbols.length > 0,
  })

  const snapshots: Record<string, any> = snapshotData?.snapshots ?? {}

  const rows = optionPositions.map((pos: any) => {
    const snap   = snapshots[pos.symbol]
    const greeks = snap?.greeks ?? {}
    const quote  = snap?.latestQuote ?? {}
    const { underlying, expiry, optType, strike } = parseOptionSymbol(pos.symbol)
    const qty = parseFloat(pos.qty)

    return {
      symbol:      pos.symbol,
      underlying,
      expiry,
      optType,
      strike,
      qty,
      bid:         quote.bp ?? 0,
      ask:         quote.ap ?? 0,
      iv:          snap?.impliedVolatility ?? 0,
      delta:       greeks.delta ?? 0,
      gamma:       greeks.gamma ?? 0,
      theta:       greeks.theta ?? 0,
      vega:        greeks.vega  ?? 0,
      unrealizedPl: parseFloat(pos.unrealized_pl),
    }
  })

  const totalDelta = rows.reduce((s: number, r: any) => s + r.delta * Math.abs(r.qty) * 100, 0)
  const totalTheta = rows.reduce((s: number, r: any) => s + r.theta * Math.abs(r.qty) * 100, 0)
  const totalVega  = rows.reduce((s: number, r: any) => s + r.vega  * Math.abs(r.qty) * 100, 0)

  const fmt = (n: number) => n.toFixed(2)

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header">
        <span>Options / Greeks</span>
        <div style={{ display: 'flex', gap: 12 }}>
          {rows.length > 0 && <>
            <span className="dim" style={{ fontSize: 9 }}>
              Δ <span className={totalDelta >= 0 ? 'up' : 'down'}>{fmt(totalDelta)}</span>
            </span>
            <span className="dim" style={{ fontSize: 9 }}>
              Θ <span className="down">{fmt(totalTheta)}</span>
            </span>
            <span className="dim" style={{ fontSize: 9 }}>
              ν <span className="white">{fmt(totalVega)}</span>
            </span>
          </>}
        </div>
      </div>
      <div className="panel-body">
        {rows.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#3a4050' }}>No option positions</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Contract</th>
                <th>Qty</th>
                <th>Bid</th>
                <th>Ask</th>
                <th>IV%</th>
                <th>Δ Delta</th>
                <th>Γ Gamma</th>
                <th>Θ Theta</th>
                <th>ν Vega</th>
                <th>P&L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.symbol}>
                  <td>
                    <span style={{ fontWeight: 700, color: '#e8ecf4' }}>{r.underlying}</span>
                    <span className="dim" style={{ fontSize: 9, marginLeft: 4 }}>
                      {r.expiry} {r.optType === 'P' ? 'PUT' : 'CALL'} ${r.strike}
                    </span>
                  </td>
                  <td className={r.qty < 0 ? 'down' : 'up'}>{r.qty}</td>
                  <td className="white">{r.bid > 0 ? `$${r.bid.toFixed(2)}` : '—'}</td>
                  <td className="white">{r.ask > 0 ? `$${r.ask.toFixed(2)}` : '—'}</td>
                  <td className="warn">{r.iv > 0 ? `${(r.iv * 100).toFixed(1)}%` : '—'}</td>
                  <td className={r.delta >= 0 ? 'up' : 'down'}>{r.delta !== 0 ? r.delta.toFixed(3) : '—'}</td>
                  <td className="white">{r.gamma !== 0 ? r.gamma.toFixed(4) : '—'}</td>
                  <td className="down">{r.theta !== 0 ? r.theta.toFixed(4) : '—'}</td>
                  <td className="white">{r.vega !== 0 ? r.vega.toFixed(4) : '—'}</td>
                  <td className={r.unrealizedPl >= 0 ? 'up' : 'down'}>
                    {r.unrealizedPl >= 0 ? '+' : ''}${fmt(r.unrealizedPl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
