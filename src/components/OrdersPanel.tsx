import { useQuery } from '@tanstack/react-query'
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
  new:             '#2979ff',
  accepted:        '#2979ff',
  pending_new:     '#2979ff',
  partially_filled:'#ffaa00',
  filled:          '#00e676',
  canceled:        '#5a6070',
  expired:         '#5a6070',
  rejected:        '#ff3d57',
  replaced:        '#5a6070',
}

function OrderRow({ o }: { o: Order }) {
  const fmt = (n: string | null) => n ? parseFloat(n).toFixed(2) : '—'
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
        <span style={{
          color: STATUS_COLOR[o.status] ?? '#c8cdd8',
          fontSize: 10,
          fontWeight: 600,
        }}>
          {o.status.replace(/_/g, ' ').toUpperCase()}
        </span>
      </td>
    </tr>
  )
}

export function OrdersPanel() {
  const [tab, setTab] = useState<'open' | 'all'>('open')

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders', tab],
    queryFn: () => api.orders(tab === 'open' ? 'open' : 'all', 50),
    refetchInterval: 5000,
  })

  const TabBtn = ({ id, label }: { id: 'open' | 'all'; label: string }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        background: 'none',
        border: 'none',
        color: tab === id ? '#e8ecf4' : '#3a4050',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        padding: '0 4px',
        borderBottom: tab === id ? '1px solid #2979ff' : '1px solid transparent',
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header">
        <span>Orders</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <TabBtn id="open" label="Open" />
          <TabBtn id="all" label="Recent" />
          <span className="dim">{orders.length}</span>
        </div>
      </div>
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
              </tr>
            </thead>
            <tbody>
              {orders.map(o => <OrderRow key={o.id} o={o} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
