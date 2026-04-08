import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/alpaca'
import { useFlash } from '../hooks/useFlash'

function Stat({ label, value, cls = '' }: { label: string; value: string; cls?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 90 }}>
      <span style={{ fontSize: 9, color: '#3a4050', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.03em' }} className={cls}>{value}</span>
    </div>
  )
}

function LiveDot({ connected }: { connected: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: connected ? '#00e676' : '#ff3d57',
        boxShadow: connected ? '0 0 6px #00e676' : 'none',
      }} className={connected ? 'blink' : ''} />
      <span style={{ fontSize: 9, color: '#3a4050' }}>{connected ? 'LIVE' : 'DISCONNECTED'}</span>
    </div>
  )
}

function Clock({ tz, label }: { tz: string; label: string }) {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: tz }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 9, color: '#3a4050' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#c8cdd8', letterSpacing: '0.05em' }}>{t}</div>
    </div>
  )
}

export function Header({ wsConnected }: { wsConnected: boolean }) {
  const { data: acct } = useQuery({ queryKey: ['account'], queryFn: api.account, refetchInterval: 5000 })

  const equity = parseFloat(acct?.equity ?? '0')
  const cash   = parseFloat(acct?.cash ?? '0')
  const lastEq = parseFloat(acct?.last_equity ?? '0')
  const dayPnl = equity - lastEq
  const dayPct = lastEq ? (dayPnl / lastEq) * 100 : 0
  const obp    = parseFloat(acct?.options_buying_power ?? '0')

  const flash = useFlash(equity)

  const fmt  = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtK = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : fmt(n)

  return (
    <div style={{
      background: '#0d1117',
      borderBottom: '1px solid #1e2229',
      padding: '6px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
        <div style={{ width: 8, height: 8, background: '#2979ff', borderRadius: 1, boxShadow: '0 0 8px #2979ff80' }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: '#e8ecf4' }}>MHTERM</span>
      </div>

      <div style={{ width: 1, height: 28, background: '#1e2229' }} />

      {/* Equity */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 9, color: '#3a4050', letterSpacing: '0.1em' }}>PORTFOLIO</span>
        <span
          style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.03em', color: '#e8ecf4' }}
          className={flash ? `flash-${flash}` : ''}
        >
          ${fmt(equity)}
        </span>
      </div>

      <div style={{ width: 1, height: 28, background: '#1e2229' }} />

      {/* Day P&L */}
      <Stat
        label="Day P&L"
        value={`${dayPnl >= 0 ? '+' : ''}$${fmt(Math.abs(dayPnl))} (${dayPct >= 0 ? '+' : ''}${dayPct.toFixed(2)}%)`}
        cls={dayPnl >= 0 ? 'up' : 'down'}
      />

      <div style={{ width: 1, height: 28, background: '#1e2229' }} />
      <Stat label="Cash" value={`$${fmtK(cash)}`} />
      <Stat label="Options BP" value={`$${fmtK(obp)}`} />

      <div style={{ flex: 1 }} />

      <LiveDot connected={wsConnected} />
      <Clock tz="Asia/Singapore" label="SINGAPORE" />
      <div style={{ width: 1, height: 28, background: '#1e2229' }} />
      <Clock tz="America/New_York" label="NEW YORK" />
    </div>
  )
}
