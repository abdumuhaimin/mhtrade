import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/alpaca'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useState } from 'react'

const PERIODS = ['1W', '1M', '3M', '1Y'] as const
type Period = typeof PERIODS[number]

const PERIOD_MAP: Record<Period, { period: string; timeframe: string }> = {
  '1W': { period: '1W', timeframe: '1H' },
  '1M': { period: '1M', timeframe: '1D' },
  '3M': { period: '3M', timeframe: '1D' },
  '1Y': { period: '1A', timeframe: '1D' },
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #1e2229',
      padding: '4px 8px',
      fontSize: 11,
      borderRadius: 2,
    }}>
      <span style={{ color: '#c8cdd8' }}>${fmt(v)}</span>
      <div style={{ fontSize: 9, color: '#5a6070' }}>{payload[0].payload.label}</div>
    </div>
  )
}

export function PortfolioChart() {
  const [period, setPeriod] = useState<Period>('1M')
  const { period: p, timeframe: tf } = PERIOD_MAP[period]

  const { data } = useQuery({
    queryKey: ['portfolio', p, tf],
    queryFn: () => api.portfolio(p, tf),
    refetchInterval: 60000,
  })

  const entries: { equity: number; timestamp: number }[] = data?.equity
    ? data.equity.map((eq: number, i: number) => ({ equity: eq, timestamp: data.timestamp[i] }))
    : []

  const chartData = entries
    .filter(e => e.equity != null && e.equity > 0)
    .map(e => ({
      v: e.equity,
      label: new Date(e.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))

  const first = chartData[0]?.v ?? 0
  const last  = chartData[chartData.length - 1]?.v ?? 0
  const chg   = last - first
  const chgPct = first ? (chg / first) * 100 : 0
  const isUp   = chg >= 0

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const minV = Math.min(...chartData.map(d => d.v)) * 0.999
  const maxV = Math.max(...chartData.map(d => d.v)) * 1.001

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>Equity Curve</span>
          {chg !== 0 && (
            <span className={isUp ? 'up' : 'down'} style={{ fontSize: 10 }}>
              {isUp ? '+' : ''}${fmt(chg)} ({isUp ? '+' : ''}{chgPct.toFixed(2)}%)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {PERIODS.map(per => (
            <button
              key={per}
              onClick={() => setPeriod(per)}
              style={{
                background: period === per ? '#2979ff20' : 'transparent',
                border: `1px solid ${period === per ? '#2979ff' : '#1e2229'}`,
                color: period === per ? '#2979ff' : '#5a6070',
                fontSize: 9,
                padding: '2px 6px',
                cursor: 'pointer',
                borderRadius: 2,
              }}
            >
              {per}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: '8px 4px 4px 0', minHeight: 0 }}>
        {chartData.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#3a4050' }}>
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={isUp ? '#00e676' : '#ff3d57'} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={isUp ? '#00e676' : '#ff3d57'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: '#3a4050', fontSize: 9 }}
                axisLine={{ stroke: '#1e2229' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[minV, maxV]}
                tick={{ fill: '#3a4050', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v/1000).toFixed(0)}K`}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="v"
                stroke={isUp ? '#00e676' : '#ff3d57'}
                strokeWidth={1.5}
                fill="url(#eqGrad)"
                dot={false}
                activeDot={{ r: 3, fill: isUp ? '#00e676' : '#ff3d57' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
