import { describe, it, expect } from 'vitest'
import {
  dailyReturns,
  calcBeta,
  calcCorrelation,
  calcVaR,
  calcCVaR,
  calcPortfolioReturns,
} from './analytics'

// ── dailyReturns ──────────────────────────────────────────────────────────────
describe('dailyReturns', () => {
  it('computes correct returns from close prices', () => {
    const closes = [100, 105, 100, 110]
    const returns = dailyReturns(closes)
    expect(returns).toHaveLength(3)
    expect(returns[0]).toBeCloseTo(0.05)   // 100→105
    expect(returns[1]).toBeCloseTo(-0.0476, 3) // 105→100
    expect(returns[2]).toBeCloseTo(0.1)    // 100→110
  })

  it('returns empty array for single price', () => {
    expect(dailyReturns([100])).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(dailyReturns([])).toEqual([])
  })

  it('skips division when prior close is zero', () => {
    // price[0]=0 would cause div-by-zero — should be skipped
    const result = dailyReturns([0, 100, 110])
    expect(result).toHaveLength(1)
    expect(result[0]).toBeCloseTo(0.1)
  })
})

// ── calcBeta ──────────────────────────────────────────────────────────────────
describe('calcBeta', () => {
  it('returns 1.0 for a series identical to the market', () => {
    const mkt = [0.01, -0.02, 0.015, -0.005, 0.03]
    expect(calcBeta(mkt, mkt)).toBeCloseTo(1.0)
  })

  it('returns 2.0 for a series that is exactly 2× the market', () => {
    const mkt  = [0.01, -0.02, 0.015, -0.01, 0.02]
    const pos  = mkt.map(r => r * 2)
    expect(calcBeta(pos, mkt)).toBeCloseTo(2.0)
  })

  it('returns negative beta for inverse series', () => {
    const mkt = [0.01, -0.02, 0.015, -0.01, 0.02]
    const pos = mkt.map(r => -r)
    expect(calcBeta(pos, mkt)).toBeCloseTo(-1.0)
  })

  it('returns 1 when market variance is zero', () => {
    const flat = [0, 0, 0, 0]
    expect(calcBeta([0.01, 0.02, -0.01, 0.005], flat)).toBe(1)
  })
})

// ── calcCorrelation ───────────────────────────────────────────────────────────
describe('calcCorrelation', () => {
  it('returns 1.0 for identical series', () => {
    const s = [0.01, -0.02, 0.03, -0.01, 0.02]
    expect(calcCorrelation(s, s)).toBeCloseTo(1.0)
  })

  it('returns -1.0 for perfectly inverse series', () => {
    const s = [0.01, -0.02, 0.03, -0.01, 0.02]
    expect(calcCorrelation(s, s.map(v => -v))).toBeCloseTo(-1.0)
  })

  it('returns 0 when one series is constant', () => {
    const s = [0.01, -0.02, 0.03]
    const c = [0, 0, 0]
    expect(calcCorrelation(s, c)).toBe(0)
  })

  it('result is bounded between -1 and 1', () => {
    const a = [0.05, -0.03, 0.02, 0.01, -0.04]
    const b = [0.01,  0.02, -0.01, 0.03, 0.005]
    const r = calcCorrelation(a, b)
    expect(r).toBeGreaterThanOrEqual(-1)
    expect(r).toBeLessThanOrEqual(1)
  })
})

// ── calcVaR ───────────────────────────────────────────────────────────────────
describe('calcVaR', () => {
  it('returns the 5th-percentile loss at 95% confidence', () => {
    // 20 returns: the 5th percentile (idx=0 of bottom 5%) should be the min
    const returns = Array.from({ length: 20 }, (_, i) => (i - 10) / 100) // -0.10 to +0.09
    const var95 = calcVaR(returns, 0.95)
    expect(var95).toBeLessThan(0)         // always a loss
    expect(var95).toBeGreaterThanOrEqual(-0.10)
  })

  it('returns 0 for empty array', () => {
    expect(calcVaR([], 0.95)).toBe(0)
  })

  it('worst day is more negative than 99% VaR', () => {
    const returns = [-0.10, -0.05, 0.02, 0.03, -0.01, 0.04, -0.03, 0.01, 0.02, -0.02]
    const var99 = calcVaR(returns, 0.99)
    const var95 = calcVaR(returns, 0.95)
    // 99% VaR should be more conservative (lower) than 95% VaR
    expect(var99).toBeLessThanOrEqual(var95)
  })
})

// ── calcCVaR ──────────────────────────────────────────────────────────────────
describe('calcCVaR', () => {
  it('CVaR is always <= VaR (more conservative)', () => {
    const returns = [-0.10, -0.05, 0.02, 0.03, -0.01, 0.04, -0.03, 0.01, 0.02, -0.02]
    const var95  = calcVaR(returns, 0.95)
    const cvar95 = calcCVaR(returns, 0.95)
    expect(cvar95).toBeLessThanOrEqual(var95)
  })

  it('returns 0 for empty array', () => {
    expect(calcCVaR([], 0.95)).toBe(0)
  })

  it('equals VaR when only one tail observation', () => {
    // With 10 returns, 5% tail = just index 0
    const returns = [-0.20, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]
    const var95  = calcVaR(returns, 0.95)
    const cvar95 = calcCVaR(returns, 0.95)
    expect(cvar95).toBeCloseTo(var95)
  })
})

// ── calcPortfolioReturns ──────────────────────────────────────────────────────
describe('calcPortfolioReturns', () => {
  it('returns weighted sum of individual returns', () => {
    const symbolReturns = {
      AAPL: [0.02, -0.01, 0.03],
      MSFT: [0.01,  0.02, -0.01],
    }
    const weights = { AAPL: 0.6, MSFT: 0.4 }
    const port = calcPortfolioReturns(symbolReturns, weights)
    expect(port).toHaveLength(3)
    expect(port[0]).toBeCloseTo(0.02 * 0.6 + 0.01 * 0.4)  // 0.016
    expect(port[1]).toBeCloseTo(-0.01 * 0.6 + 0.02 * 0.4)  // 0.002
    expect(port[2]).toBeCloseTo(0.03 * 0.6 + -0.01 * 0.4)  // 0.014
  })

  it('returns empty array when no symbols', () => {
    expect(calcPortfolioReturns({}, {})).toEqual([])
  })

  it('returns empty array when symbol returns are missing', () => {
    expect(calcPortfolioReturns({}, { AAPL: 0.5 })).toEqual([])
  })

  it('clips to shortest series length', () => {
    const symbolReturns = {
      A: [0.01, 0.02, 0.03, 0.04],
      B: [0.01, 0.02],
    }
    const result = calcPortfolioReturns(symbolReturns, { A: 0.5, B: 0.5 })
    expect(result).toHaveLength(2)
  })

  it('weights sum to 1 produces returns in realistic range', () => {
    const r = { SPY: [0.01, -0.02, 0.015], QQQ: [-0.005, 0.03, 0.01] }
    const w = { SPY: 0.5, QQQ: 0.5 }
    const port = calcPortfolioReturns(r, w)
    port.forEach(ret => {
      expect(Math.abs(ret)).toBeLessThan(0.1)
    })
  })
})
