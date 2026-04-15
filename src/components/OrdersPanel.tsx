import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/alpaca'
import { useState } from 'react'

type Order = {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: string
  qty: string
  filled_qty: string
  limit_price: string | null
  stop_price: string | null
  status: string
  created_at: string
  filled_avg_price: string | null
  order_class: string
  asset_class: string
}

const STATUS_COLOR: Record<string, string> = {
  new:              '#2979ff',
  accepted:         '#2979ff',
  pending_new:      '#2979ff',
  partially_filled: '#ffaa00',
  filled:           '#00e676',
  canceled:         '#5a6070',
  expired:          '#5a6070',
  rejected:         '#ff3d57',
  replaced:         '#5a6070',
}

const CANCELLABLE = new Set(['new', 'accepted', 'pending_new', 'partially_filled'])

// ── Order row ─────────────────────────────────────────────────────────────────
function OrderRow({ o, onCancel }: { o: Order; onCancel?: () => void }) {
  const fmt  = (n: string | null) => n ? parseFloat(n).toFixed(2) : '—'
  const time = new Date(o.created_at).toLocaleTimeString('en-US', {
    hour12: false, timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit',
  })
  const price = o.filled_avg_price ?? o.limit_price ?? o.stop_price

  return (
    <tr>
      <td style={{ color: '#5a6070', fontSize: 10 }}>{time}</td>
      <td>
        <span style={{ fontWeight: 700, color: '#e8ecf4' }}>{o.symbol}</span>
        {o.asset_class === 'us_option' && <span className="dim" style={{ fontSize: 9, marginLeft: 4 }}>OPT</span>}
      </td>
      <td className={o.side === 'buy' ? 'up' : 'down'} style={{ fontWeight: 600 }}>
        {o.side.toUpperCase()}
      </td>
      <td className="dim" style={{ fontSize: 10 }}>{o.type}</td>
      <td className="white">{parseFloat(o.filled_qty || '0') > 0 ? `${o.filled_qty}/${o.qty}` : o.qty}</td>
      <td className="white">{price ? `$${fmt(price)}` : '—'}</td>
      <td>
        <span style={{ color: STATUS_COLOR[o.status] ?? '#c8cdd8', fontSize: 10, fontWeight: 600 }}>
          {o.status.replace(/_/g, ' ').toUpperCase()}
        </span>
      </td>
      <td style={{ width: 24, padding: '3px 4px' }}>
        {CANCELLABLE.has(o.status) && onCancel && (
          <button
            onClick={onCancel}
            title="Cancel order"
            style={{
              background: 'none', border: 'none', color: '#5a6070',
              cursor: 'pointer', fontSize: 11, padding: '0 2px',
              lineHeight: 1, fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff3d57')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5a6070')}
          >
            ✕
          </button>
        )}
      </td>
    </tr>
  )
}

// ── New order form ────────────────────────────────────────────────────────────
function NewOrderForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const [sym,   setSym]   = useState('')
  const [side,  setSide]  = useState<'buy' | 'sell'>('buy')
  const [type,  setType]  = useState<'market' | 'limit'>('market')
  const [qty,   setQty]   = useState('')
  const [limit, setLimit] = useState('')
  const [tif,   setTif]   = useState('day')
  const [err,   setErr]   = useState('')

  const mutation = useMutation({
    mutationFn: () => api.placeOrder({
      symbol: sym.trim().toUpperCase(),
      qty,
      side,
      type,
      time_in_force: tif,
      ...(type === 'limit' ? { limit_price: limit } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      onDone()
    },
    onError: (e: any) => setErr(e.message ?? 'Order failed'),
  })

  const inp: React.CSSProperties = {
    background: '#0a0c0f', border: '1px solid #1e2229', color: '#c8cdd8',
    fontSize: 11, padding: '4px 6px', borderRadius: 2, fontFamily: 'inherit',
    outline: 'none', width: '100%',
  }

  const btnBase: React.CSSProperties = {
    background: 'none', border: '1px solid #1e2229', color: '#5a6070',
    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 8px',
    cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit', flex: 1,
  }

  const submit = () => {
    setErr('')
    if (!sym.trim()) return setErr('Symbol required')
    if (!qty || parseFloat(qty) <= 0) return setErr('Qty required')
    if (type === 'limit' && (!limit || parseFloat(limit) <= 0)) return setErr('Limit price required')
    mutation.mutate()
  }

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Side + Type toggles */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ display: 'flex', flex: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid #1e2229' }}>
          {(['buy', 'sell'] as const).map(s => (
            <button key={s} onClick={() => setSide(s)} style={{
              flex: 1, background: side === s ? (s === 'buy' ? '#00e67620' : '#ff3d5720') : 'none',
              border: 'none', color: side === s ? (s === 'buy' ? '#00e676' : '#ff3d57') : '#3a4050',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 0',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flex: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid #1e2229' }}>
          {(['market', 'limit'] as const).map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, background: type === t ? '#2979ff20' : 'none',
              border: 'none', color: type === t ? '#2979ff' : '#3a4050',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 0',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {t === 'market' ? 'MKT' : 'LMT'}
            </button>
          ))}
        </div>
      </div>

      {/* Symbol + Qty */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 8, color: '#3a4050', letterSpacing: '0.1em', marginBottom: 3 }}>SYMBOL</div>
          <input
            style={inp}
            value={sym}
            onChange={e => setSym(e.target.value.toUpperCase())}
            placeholder="SPY"
            maxLength={10}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8, color: '#3a4050', letterSpacing: '0.1em', marginBottom: 3 }}>QTY</div>
          <input
            style={inp}
            value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder="1"
            type="number"
            min="0"
          />
        </div>
      </div>

      {/* Limit price + TIF */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 8, color: '#3a4050', letterSpacing: '0.1em', marginBottom: 3 }}>
            {type === 'limit' ? 'LIMIT PRICE' : 'LIMIT PRICE'}
          </div>
          <input
            style={{ ...inp, opacity: type === 'limit' ? 1 : 0.35 }}
            value={limit}
            onChange={e => setLimit(e.target.value)}
            placeholder="0.00"
            type="number"
            min="0"
            step="0.01"
            disabled={type === 'market'}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8, color: '#3a4050', letterSpacing: '0.1em', marginBottom: 3 }}>TIF</div>
          <select
            value={tif}
            onChange={e => setTif(e.target.value)}
            style={{ ...inp, cursor: 'pointer' }}
          >
            <option value="day">DAY</option>
            <option value="gtc">GTC</option>
            <option value="ioc">IOC</option>
            <option value="fok">FOK</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {err && <div style={{ fontSize: 9, color: '#ff3d57' }}>{err}</div>}

      {/* Submit */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={submit}
          disabled={mutation.isPending}
          style={{
            ...btnBase,
            background: side === 'buy' ? '#00e67615' : '#ff3d5715',
            borderColor: side === 'buy' ? '#00e676' : '#ff3d57',
            color: side === 'buy' ? '#00e676' : '#ff3d57',
            opacity: mutation.isPending ? 0.5 : 1,
          }}
        >
          {mutation.isPending ? 'PLACING…' : `PLACE ${side.toUpperCase()} ORDER`}
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function OrdersPanel() {
  const [tab, setTab] = useState<'open' | 'all' | 'new'>('open')
  const qc = useQueryClient()

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders', tab === 'new' ? 'open' : tab],
    queryFn: () => api.orders(tab === 'all' ? 'all' : 'open', 50),
    refetchInterval: 5000,
    enabled: tab !== 'new',
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const TabBtn = ({ id, label }: { id: 'open' | 'all' | 'new'; label: string }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        background: 'none',
        border: 'none',
        color: tab === id ? (id === 'new' ? '#00e676' : '#e8ecf4') : '#3a4050',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        padding: '0 4px',
        borderBottom: tab === id ? `1px solid ${id === 'new' ? '#00e676' : '#2979ff'}` : '1px solid transparent',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header">
        <span>Orders</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TabBtn id="open"  label="Open" />
          <TabBtn id="all"   label="Recent" />
          <TabBtn id="new"   label="+ New" />
          {tab !== 'new' && <span className="dim">{orders.length}</span>}
        </div>
      </div>

      {tab === 'new' ? (
        <NewOrderForm onDone={() => setTab('open')} />
      ) : (
        <div className="panel-body">
          {orders.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#3a4050' }}>
              {tab === 'open' ? 'No open orders' : 'No recent orders'}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Time</th>
                  <th style={{ textAlign: 'left' }}>Symbol</th>
                  <th>Side</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <OrderRow
                    key={o.id}
                    o={o}
                    onCancel={tab === 'open' ? () => cancelMutation.mutate(o.id) : undefined}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
