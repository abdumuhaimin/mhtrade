import { useState, useEffect, useMemo, CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/alpaca'
import { useLivePrices } from '../hooks/useLivePrices'
import { calcBeta, calcCorrelation, calcVaR, calcCVaR, calcPortfolioReturns, dailyReturns } from '../lib/analytics'
import { getSector } from '../lib/sectors'

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n: number) => {
  const abs = Math.abs(n)
  const s = abs >= 1000 ? `${(abs / 1000).toFixed(2)}K` : abs.toFixed(2)
  return `${n >= 0 ? '+' : '-'}$${s}`
}
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`

const inputCss: CSSProperties = {
  background: '#0a0c0f', border: '1px solid #1e2229', color: '#c8cdd8',
  fontSize: 11, padding: '3px 6px', borderRadius: 2, fontFamily: 'inherit', outline: 'none',
}

// ── GREEKS tab ────────────────────────────────────────────────────────────────
function parseOptionSymbol(sym: string) {
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

function GreeksTab() {
  const { data: positions = [] } = useQuery<any[]>({
    queryKey: ['positions'], queryFn: api.positions, refetchInterval: 30000,
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
    const snap = snapshots[pos.symbol]
    const greeks = snap?.greeks ?? {}
    const quote = snap?.latestQuote ?? {}
    const { underlying, expiry, optType, strike } = parseOptionSymbol(pos.symbol)
    const qty = parseFloat(pos.qty)
    return {
      symbol: pos.symbol, underlying, expiry, optType, strike, qty,
      bid: quote.bp ?? 0, ask: quote.ap ?? 0, iv: snap?.impliedVolatility ?? 0,
      delta: greeks.delta ?? 0, gamma: greeks.gamma ?? 0,
      theta: greeks.theta ?? 0, vega: greeks.vega ?? 0,
      unrealizedPl: parseFloat(pos.unrealized_pl),
    }
  })

  const totalDelta = rows.reduce((s, r) => s + r.delta * Math.abs(r.qty) * 100, 0)
  const totalTheta = rows.reduce((s, r) => s + r.theta * Math.abs(r.qty) * 100, 0)
  const totalVega  = rows.reduce((s, r) => s + r.vega  * Math.abs(r.qty) * 100, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 16, padding: '4px 10px', borderBottom: '1px solid #1e2229', flexShrink: 0 }}>
          <span className="dim" style={{ fontSize: 9 }}>Δ <span className={totalDelta >= 0 ? 'up' : 'down'}>{totalDelta.toFixed(2)}</span></span>
          <span className="dim" style={{ fontSize: 9 }}>Θ <span className="down">{totalTheta.toFixed(2)}</span></span>
          <span className="dim" style={{ fontSize: 9 }}>ν <span className="white">{totalVega.toFixed(2)}</span></span>
        </div>
      )}
      <div className="panel-body">
        {rows.length === 0
          ? <div style={{ padding: 20, textAlign: 'center', color: '#3a4050' }}>No option positions</div>
          : (
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Contract</th>
                  <th>Qty</th><th>Bid</th><th>Ask</th><th>IV%</th>
                  <th>Δ</th><th>Γ</th><th>Θ</th><th>ν</th><th>P&L</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
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
                      {r.unrealizedPl >= 0 ? '+' : ''}${r.unrealizedPl.toFixed(2)}
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

// ── RISK tab ──────────────────────────────────────────────────────────────────
function RiskTab() {
  const { data: positions = [] } = useQuery<any[]>({
    queryKey: ['positions'], queryFn: api.positions, refetchInterval: 10000,
  })
  const stockPos = positions.filter((p: any) => p.asset_class !== 'us_option')
  const totalMV  = positions.reduce((s: number, p: any) => s + parseFloat(p.market_value), 0)
  const symbols  = useMemo(() => [...new Set(stockPos.map((p: any) => p.symbol as string))], [stockPos.map((p: any) => p.symbol).join(',')])

  const { data: barsData, isLoading } = useQuery({
    queryKey: ['risk-bars', [...symbols, 'SPY'].join(',')],
    queryFn:  () => api.bars([...symbols, 'SPY'].join(','), '1Day', 40),
    staleTime: 300_000,
    enabled:   symbols.length > 0,
  })

  const analysis = useMemo(() => {
    if (!barsData?.bars) return null
    const bars = barsData.bars as Record<string, any[]>
    const spyRet = dailyReturns((bars['SPY'] ?? []).map((b: any) => b.c))
    if (spyRet.length < 5) return null

    const symbolReturns: Record<string, number[]> = {}
    const weights: Record<string, number> = {}
    let portfolioBeta = 0

    const rows = stockPos.map((p: any) => {
      const mv     = parseFloat(p.market_value)
      const weight = totalMV > 0 ? mv / totalMV : 0
      const ret    = dailyReturns((bars[p.symbol] ?? []).map((b: any) => b.c))
      const n      = Math.min(ret.length, spyRet.length)
      const r = ret.slice(-n), m = spyRet.slice(-n)
      const b = n >= 5 ? calcBeta(r, m) : 1
      const c = n >= 5 ? calcCorrelation(r, m) : 0
      symbolReturns[p.symbol] = r
      weights[p.symbol] = weight
      portfolioBeta += b * weight
      return { symbol: p.symbol, weight, beta: b, corr: c, contrib: b * weight }
    })

    const portRet = calcPortfolioReturns(symbolReturns, weights)
    return {
      rows: rows.sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib)),
      portfolioBeta,
      var95:  calcVaR(portRet, 0.95),
      cvar95: calcCVaR(portRet, 0.95),
      totalMV,
    }
  }, [barsData, stockPos.map((p: any) => p.symbol + p.market_value).join(',')])

  if (isLoading) return <div style={{ padding: 24, textAlign: 'center', color: '#3a4050' }}>Computing risk metrics…</div>
  if (!analysis) return <div style={{ padding: 24, textAlign: 'center', color: '#3a4050' }}>Insufficient data</div>

  const { rows, portfolioBeta, var95, cvar95 } = analysis

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #1e2229', flexShrink: 0 }}>
        {[
          { label: 'PORTFOLIO β',   value: portfolioBeta.toFixed(2), cls: Math.abs(portfolioBeta) > 1.3 ? 'warn' : 'white' },
          { label: 'VaR 95% (1D)',  value: fmtPct(var95),            cls: 'down' },
          { label: 'CVaR 95% (1D)', value: fmtPct(cvar95),           cls: 'down' },
          { label: 'VaR $ (1D)',    value: `$${Math.abs(var95 * totalMV).toFixed(0)}`, cls: 'down' },
        ].map(({ label, value, cls }) => (
          <div key={label} style={{ flex: 1, padding: '5px 8px', borderRight: '1px solid #1e2229' }}>
            <div style={{ fontSize: 8, color: '#3a4050', letterSpacing: '0.1em' }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 700 }} className={cls}>{value}</div>
          </div>
        ))}
      </div>
      <div className="panel-body">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Symbol</th>
              <th>Weight</th><th>Beta</th><th>Corr(SPY)</th><th>β Contrib</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.symbol}>
                <td style={{ fontWeight: 700, color: '#e8ecf4' }}>{r.symbol}</td>
                <td className="dim">{(r.weight * 100).toFixed(1)}%</td>
                <td className={r.beta > 1.3 ? 'warn' : r.beta < 0 ? 'down' : 'white'}>{r.beta.toFixed(2)}</td>
                <td className={r.corr > 0.7 ? 'up' : r.corr < 0.3 ? 'dim' : 'white'}>{r.corr.toFixed(2)}</td>
                <td className={r.contrib >= 0 ? '' : 'down'}>{r.contrib.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── ATTRIBUTION tab ───────────────────────────────────────────────────────────
function AttributionTab() {
  const { data: positions = [] } = useQuery<any[]>({
    queryKey: ['positions'], queryFn: api.positions, refetchInterval: 10000,
  })

  const totalPnl = positions.reduce((s: number, p: any) => s + parseFloat(p.unrealized_pl), 0)

  const bySector = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; mv: number }>()
    for (const p of positions as any[]) {
      const sector = getSector(p.symbol)
      const cur = map.get(sector) ?? { pnl: 0, count: 0, mv: 0 }
      map.set(sector, { pnl: cur.pnl + parseFloat(p.unrealized_pl), count: cur.count + 1, mv: cur.mv + parseFloat(p.market_value) })
    }
    return [...map.entries()].sort((a, b) => b[1].pnl - a[1].pnl)
  }, [positions])

  const stockPnl  = positions.filter((p: any) => p.asset_class !== 'us_option').reduce((s: number, p: any) => s + parseFloat(p.unrealized_pl), 0)
  const optionPnl = positions.filter((p: any) => p.asset_class === 'us_option').reduce((s: number, p: any) => s + parseFloat(p.unrealized_pl), 0)

  const sorted  = [...(positions as any[])].sort((a, b) => parseFloat(b.unrealized_pl) - parseFloat(a.unrealized_pl))
  const winners = sorted.slice(0, 3)
  const losers  = sorted.slice(-3).reverse()
  const shortSym = (s: string) => s.length > 10 ? s.slice(0, 9) + '…' : s

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="panel-body">
        {/* Sector breakdown */}
        <div style={{ fontSize: 9, color: '#3a4050', letterSpacing: '0.1em', padding: '4px 8px 2px' }}>BY SECTOR</div>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Sector</th>
              <th>Pos</th><th>Mkt Val</th><th>P&L</th><th>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {bySector.map(([sector, d]) => {
              const contrib = totalPnl !== 0 ? (d.pnl / Math.abs(totalPnl)) * 100 : 0
              return (
                <tr key={sector}>
                  <td style={{ color: '#e8ecf4' }}>{sector}</td>
                  <td className="dim">{d.count}</td>
                  <td className="dim">${d.mv >= 1000 ? `${(d.mv / 1000).toFixed(1)}K` : d.mv.toFixed(0)}</td>
                  <td className={d.pnl >= 0 ? 'up' : 'down'}>{fmtMoney(d.pnl)}</td>
                  <td className={contrib >= 0 ? 'up' : 'down'}>{contrib.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div style={{ borderTop: '1px solid #1e2229', marginTop: 4, display: 'flex' }}>
          {/* Asset class */}
          <div style={{ flex: 1, padding: '4px 0', borderRight: '1px solid #1e2229' }}>
            <div style={{ fontSize: 9, color: '#3a4050', letterSpacing: '0.1em', padding: '2px 8px 4px' }}>ASSET CLASS</div>
            {[['Stocks', stockPnl], ['Options', optionPnl]].map(([label, pnl]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px' }}>
                <span className="dim">{label as string}</span>
                <span className={(pnl as number) >= 0 ? 'up' : 'down'}>{fmtMoney(pnl as number)}</span>
              </div>
            ))}
          </div>

          {/* Winners */}
          <div style={{ flex: 1.2, padding: '4px 8px', borderRight: '1px solid #1e2229' }}>
            <div style={{ fontSize: 9, color: '#00e676', letterSpacing: '0.1em', marginBottom: 3 }}>TOP WINNERS</div>
            {winners.map((p: any) => (
              <div key={p.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 }}>
                <span style={{ color: '#e8ecf4', fontWeight: 700 }}>{shortSym(p.symbol)}</span>
                <span className="up">{fmtMoney(parseFloat(p.unrealized_pl))}</span>
              </div>
            ))}
          </div>

          {/* Losers */}
          <div style={{ flex: 1.2, padding: '4px 8px' }}>
            <div style={{ fontSize: 9, color: '#ff3d57', letterSpacing: '0.1em', marginBottom: 3 }}>TOP LOSERS</div>
            {losers.map((p: any) => (
              <div key={p.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 }}>
                <span style={{ color: '#e8ecf4', fontWeight: 700 }}>{shortSym(p.symbol)}</span>
                <span className="down">{fmtMoney(parseFloat(p.unrealized_pl))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ALERTS tab ────────────────────────────────────────────────────────────────
type Alert = { id: string; symbol: string; condition: 'above' | 'below'; price: number; note: string; triggered: boolean }

function AlertsTab() {
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    try { return JSON.parse(localStorage.getItem('terminal_alerts') ?? '[]') } catch { return [] }
  })
  const [form, setForm] = useState({ symbol: '', condition: 'above' as 'above' | 'below', price: '', note: '' })

  useEffect(() => { localStorage.setItem('terminal_alerts', JSON.stringify(alerts)) }, [alerts])

  const activeSymbols = useMemo(
    () => [...new Set(alerts.filter(a => !a.triggered).map(a => a.symbol))],
    [alerts.map(a => a.symbol + a.triggered).join(',')]
  )
  const { trades, quotes } = useLivePrices(activeSymbols)

  const getLive = (sym: string): number | null => {
    const t = trades[sym]?.p
    if (t && t > 0) return t
    const q = quotes[sym]
    if (!q) return null
    const mid = q.ap && q.bp ? (q.ap + q.bp) / 2 : (q.ap || q.bp)
    return mid && mid > 0 ? mid : null
  }

  // Check triggers each tick
  useEffect(() => {
    setAlerts(prev => {
      let changed = false
      const next = prev.map(a => {
        if (a.triggered) return a
        const live = getLive(a.symbol)
        if (live === null) return a
        const hit = a.condition === 'above' ? live >= a.price : live <= a.price
        if (hit) { changed = true; return { ...a, triggered: true } }
        return a
      })
      return changed ? next : prev
    })
  }, [trades, quotes])

  const addAlert = () => {
    const price = parseFloat(form.price)
    if (!form.symbol || isNaN(price)) return
    setAlerts(prev => [{
      id: Date.now().toString(), symbol: form.symbol.toUpperCase().trim(),
      condition: form.condition, price, note: form.note, triggered: false,
    }, ...prev])
    setForm({ symbol: '', condition: 'above', price: '', note: '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Add form */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #1e2229', display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
        <input style={{ ...inputCss, width: 65 }} placeholder="Symbol" value={form.symbol}
          onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
          onKeyDown={e => e.key === 'Enter' && addAlert()} />
        <select style={inputCss} value={form.condition}
          onChange={e => setForm(f => ({ ...f, condition: e.target.value as 'above' | 'below' }))}>
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
        <input style={{ ...inputCss, width: 75 }} placeholder="Price" type="number" step="0.01" value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && addAlert()} />
        <input style={{ ...inputCss, flex: 1, minWidth: 80 }} placeholder="Note" value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && addAlert()} />
        <button onClick={addAlert}
          style={{ ...inputCss, background: '#2979ff15', border: '1px solid #2979ff', color: '#2979ff', cursor: 'pointer', padding: '3px 10px' }}>
          + ADD
        </button>
      </div>
      {/* Alerts list */}
      <div className="panel-body">
        {alerts.length === 0
          ? <div style={{ padding: 24, textAlign: 'center', color: '#3a4050' }}>No alerts — add one above</div>
          : (
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Symbol</th>
                  <th>Cond</th><th>Target</th><th>Current</th><th>Distance</th><th>Note</th><th></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => {
                  const live = getLive(a.symbol)
                  const dist = live !== null ? ((live - a.price) / a.price * 100) : null
                  return (
                    <tr key={a.id} style={a.triggered ? { background: 'rgba(255,61,87,0.06)' } : {}}>
                      <td style={{ fontWeight: 700, color: '#e8ecf4' }}>{a.symbol}</td>
                      <td className="dim">{a.condition}</td>
                      <td className="white">${a.price.toFixed(2)}</td>
                      <td>{live !== null ? <span className="white">${live.toFixed(2)}</span> : <span className="dim">—</span>}</td>
                      <td>
                        {a.triggered
                          ? <span className="down" style={{ fontWeight: 700, fontSize: 9, letterSpacing: '0.05em' }}>TRIGGERED</span>
                          : dist !== null
                            ? <span className={Math.abs(dist) < 1 ? 'warn' : 'dim'}>{dist >= 0 ? '+' : ''}{dist.toFixed(2)}%</span>
                            : <span className="dim">—</span>}
                      </td>
                      <td className="dim" style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.note}</td>
                      <td>
                        <button onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}
                          style={{ background: 'none', border: 'none', color: '#3a4050', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}

// ── SCENARIO tab ──────────────────────────────────────────────────────────────
function ScenarioTab() {
  const [shock, setShock]               = useState(0)
  const [customShocks, setCustomShocks] = useState<Record<string, number>>({})

  const { data: positions = [] } = useQuery<any[]>({
    queryKey: ['positions'], queryFn: api.positions, refetchInterval: 10000,
  })
  const stockPos = positions.filter((p: any) => p.asset_class !== 'us_option')
  const symsKey  = [...new Set(stockPos.map((p: any) => p.symbol as string)), 'SPY'].join(',')

  const { data: barsData } = useQuery({
    queryKey: ['scenario-bars', symsKey],
    queryFn:  () => api.bars(symsKey, '1Day', 40),
    staleTime: 300_000,
    enabled:   stockPos.length > 0,
  })

  const betas = useMemo(() => {
    const out: Record<string, number> = {}
    if (!barsData?.bars) return out
    const bars = barsData.bars as Record<string, any[]>
    const spyRet = dailyReturns((bars['SPY'] ?? []).map((b: any) => b.c))
    for (const p of stockPos) {
      const ret = dailyReturns((bars[p.symbol] ?? []).map((b: any) => b.c))
      const n = Math.min(ret.length, spyRet.length)
      out[p.symbol] = n >= 5 ? calcBeta(ret.slice(-n), spyRet.slice(-n)) : 1
    }
    return out
  }, [barsData, symsKey])

  // Find option greeks for options scenario
  const optPos = positions.filter((p: any) => p.asset_class === 'us_option')
  const { data: snapshotData } = useQuery({
    queryKey: ['optionSnapshots', optPos.map((p: any) => p.symbol).join(',')],
    queryFn:  () => api.optionSnapshots(optPos.map((p: any) => p.symbol)),
    staleTime: 30_000,
    enabled:   optPos.length > 0,
  })
  const snapshots: Record<string, any> = snapshotData?.snapshots ?? {}

  const impacts = useMemo(() => {
    return (positions as any[]).map((p: any) => {
      const mv  = parseFloat(p.market_value)
      const qty = parseFloat(p.qty)
      const isOpt = p.asset_class === 'us_option'
      const symShock = (customShocks[p.symbol] ?? shock) / 100
      let estPnl: number

      if (isOpt) {
        const snap  = snapshots[p.symbol]
        const delta = snap?.greeks?.delta ?? 0.5 * Math.sign(qty)
        const gamma = snap?.greeks?.gamma ?? 0
        const underlying = p.symbol.replace(/\d.*/, '')
        // delta-gamma approximation: P&L ≈ (delta × S × shock + 0.5 × gamma × (S × shock)²) × qty × 100
        const s = parseFloat(p.avg_entry_price) || 10
        estPnl = (delta * s * symShock + 0.5 * gamma * (s * symShock) ** 2) * qty * 100
        void underlying
      } else {
        const beta = betas[p.symbol] ?? 1
        estPnl = mv * beta * symShock
      }

      return { symbol: p.symbol, mv, isOpt, beta: betas[p.symbol] ?? null, estPnl }
    })
  }, [positions, betas, snapshots, shock, customShocks])

  const totalImpact = impacts.reduce((s, p) => s + p.estPnl, 0)
  const totalMV     = impacts.reduce((s, p) => s + p.mv, 0)
  const impactPct   = totalMV > 0 ? (totalImpact / totalMV) * 100 : 0
  const shockColor  = shock > 0 ? '#00e676' : shock < 0 ? '#ff3d57' : '#5a6070'

  const setCustom = (sym: string, val: string) => {
    const n = parseFloat(val)
    setCustomShocks(prev => {
      if (isNaN(n)) { const { [sym]: _, ...rest } = prev; return rest }
      return { ...prev, [sym]: n }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Controls */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #1e2229', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: '#3a4050', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>MARKET SHOCK</span>
          <input type="range" min={-30} max={30} step={0.5} value={shock}
            onChange={e => setShock(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: shockColor }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: shockColor, width: 52, textAlign: 'right' }}>
            {shock >= 0 ? '+' : ''}{shock.toFixed(1)}%
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <div>
            <div style={{ fontSize: 8, color: '#3a4050', letterSpacing: '0.1em' }}>EST. IMPACT</div>
            <div style={{ fontSize: 14, fontWeight: 800 }} className={totalImpact >= 0 ? 'up' : 'down'}>
              {fmtMoney(totalImpact)} ({impactPct >= 0 ? '+' : ''}{impactPct.toFixed(2)}%)
            </div>
          </div>
          <button onClick={() => setCustomShocks({})}
            style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #1e2229', color: '#5a6070', fontSize: 9, padding: '2px 8px', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit' }}>
            RESET
          </button>
        </div>
      </div>
      {/* Per-position */}
      <div className="panel-body">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Symbol</th>
              <th>Mkt Val</th><th>Beta</th><th>Shock %</th><th>Est. P&L</th>
            </tr>
          </thead>
          <tbody>
            {impacts.map(p => (
              <tr key={p.symbol}>
                <td style={{ fontWeight: 700, color: '#e8ecf4' }}>
                  {p.isOpt ? p.symbol.replace(/\d.*/, '') + ' OPT' : p.symbol}
                </td>
                <td className="dim">${p.mv >= 1000 ? `${(p.mv / 1000).toFixed(1)}K` : p.mv.toFixed(0)}</td>
                <td className="white">{p.beta !== null ? p.beta.toFixed(2) : <span className="dim">Δ-γ</span>}</td>
                <td>
                  <input type="number" step="0.5"
                    value={customShocks[p.symbol] !== undefined ? customShocks[p.symbol] : ''}
                    placeholder={shock.toFixed(1)}
                    onChange={e => setCustom(p.symbol, e.target.value)}
                    style={{
                      width: 54, background: 'transparent', fontFamily: 'inherit', fontSize: 10, textAlign: 'right',
                      border: customShocks[p.symbol] !== undefined ? '1px solid #2979ff' : '1px solid #1e2229',
                      color: '#c8cdd8', padding: '1px 4px', borderRadius: 2,
                    }} />
                </td>
                <td className={p.estPnl >= 0 ? 'up' : 'down'}>{fmtMoney(p.estPnl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const TABS = ['GREEKS', 'RISK', 'ATTRIBUTION', 'ALERTS', 'SCENARIO'] as const
type Tab   = typeof TABS[number]

export function AnalyticsDashboard() {
  const [tab, setTab] = useState<Tab>('GREEKS')

  return (
    <div className="panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span>Analytics</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? '#2979ff20' : 'transparent',
              border: `1px solid ${tab === t ? '#2979ff' : '#1e2229'}`,
              color: tab === t ? '#2979ff' : '#5a6070',
              fontSize: 9, padding: '2px 6px', cursor: 'pointer', borderRadius: 2,
              letterSpacing: '0.05em', fontFamily: 'inherit',
            }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'GREEKS'      && <GreeksTab />}
        {tab === 'RISK'        && <RiskTab />}
        {tab === 'ATTRIBUTION' && <AttributionTab />}
        {tab === 'ALERTS'      && <AlertsTab />}
        {tab === 'SCENARIO'    && <ScenarioTab />}
      </div>
    </div>
  )
}
