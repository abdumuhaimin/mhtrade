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
    expect(returns[0]).toBeCloseTo(0.05)
    expect(returns[1]).toBeCloseTo(-0.0476, 3)
    expect(returns[2]).toBeCloseTo(0.1)
  })

  it('returns empty array for single price', () => {
    expect(dailyReturns([100])).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(dailyReturns([])).toEqual([])
  })

  it('skips division when prior close is zero', () => {
    const result = dailyReturns([0, 100, 110])
    expect(result).toHaveLength(1)
    expect(result[0]).toBeCloseTo(0.1)
  })

  it('handles constant prices (zero returns)', () => {
    const result = dailyReturns([50, 50, 50, 50])
    expect(result).toHaveLength(3)
    result.forEach(r => expect(r).toBeCloseTo(0))
  })

  it('handles large price arrays', () => {
    const closes = Array.from({ length: 252 }, (_, i) => 100 + i * 0.1)
    const result = dailyReturns(closes)
    expect(result).toHaveLength(251)
    result.forEach(r => expect(r).toBeGreaterThan(0))
  })
})

// ── calcBeta ──────────────────────────────────────────────────────────────────
describe('calcBeta', () => {
  it('returns 1.0 for a series identical to the market', () => {
    const mkt = [0.01, -0.02, 0.015, -0.005, 0.03]
    expect(calcBeta(mkt, mkt)).toBeCloseTo(1.0)
  })

  it('returns 2.0 for a series that is exactly 2× the market', () => {
    const mkt = [0.01, -0.02, 0.015, -0.01, 0.02]
    const pos = mkt.map(r => r * 2)
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

  it('uses min length when arrays differ in size', () => {
    const mkt = [0.01, -0.02, 0.015, -0.01, 0.02]
    const pos = [0.01, -0.02, 0.015] // shorter
    // should not throw, uses 3 elements
    expect(() => calcBeta(pos, mkt)).not.toThrow()
  })

  it('returns finite value for normal inputs', () => {
    const mkt = [0.01, -0.02, 0.03, -0.015, 0.025, -0.01, 0.02]
    const pos = [0.015, -0.025, 0.04, -0.018, 0.03, -0.012, 0.022]
    const b = calcBeta(pos, mkt)
    expect(isFinite(b)).toBe(true)
    expect(b).toBeGreaterThan(0)
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
    expect(calcCorrelation([0.01, -0.02, 0.03], [0, 0, 0])).toBe(0)
  })

  it('result is bounded between -1 and 1', () => {
    const a = [0.05, -0.03, 0.02, 0.01, -0.04]
    const b = [0.01,  0.02, -0.01, 0.03, 0.005]
    const r = calcCorrelation(a, b)
    expect(r).toBeGreaterThanOrEqual(-1)
    expect(r).toBeLessThanOrEqual(1)
  })

  it('is commutative: corr(a,b) === corr(b,a)', () => {
    const a = [0.05, -0.03, 0.02, 0.01, -0.04]
    const b = [0.01,  0.02, -0.01, 0.03, 0.005]
    expect(calcCorrelation(a, b)).toBeCloseTo(calcCorrelation(b, a))
  })

  it('handles mismatched lengths by using min', () => {
    const a = [0.01, 0.02, 0.03, 0.04]
    const b = [0.01, 0.02]
    expect(() => calcCorrelation(a, b)).not.toThrow()
  })
})

// ── calcVaR ───────────────────────────────────────────────────────────────────
describe('calcVaR', () => {
  it('returns the 5th-percentile loss at 95% confidence', () => {
    const returns = Array.from({ length: 20 }, (_, i) => (i - 10) / 100)
    const var95 = calcVaR(returns, 0.95)
    expect(var95).toBeLessThan(0)
    expect(var95).toBeGreaterThanOrEqual(-0.10)
  })

  it('returns 0 for empty array', () => {
    expect(calcVaR([], 0.95)).toBe(0)
  })

  it('99% VaR is more conservative than 95% VaR', () => {
    const returns = [-0.10, -0.05, 0.02, 0.03, -0.01, 0.04, -0.03, 0.01, 0.02, -0.02]
    expect(calcVaR(returns, 0.99)).toBeLessThanOrEqual(calcVaR(returns, 0.95))
  })

  it('VaR is always negative or zero for a loss-containing portfolio', () => {
    const returns = [-0.05, -0.02, 0.01, 0.03, -0.04, 0.02, 0.01, -0.01, 0.00, -0.03]
    expect(calcVaR(returns, 0.95)).toBeLessThanOrEqual(0)
  })

  it('handles single element', () => {
    expect(calcVaR([-0.05], 0.95)).toBeCloseTo(-0.05)
  })

  it('handles all-positive returns (VaR may be positive)', () => {
    const returns = [0.01, 0.02, 0.03, 0.04, 0.05]
    const var95 = calcVaR(returns, 0.95)
    // smallest return is 0.01 — not a loss, so VaR >= 0
    expect(var95).toBeGreaterThanOrEqual(0)
  })
})

// ── calcCVaR ──────────────────────────────────────────────────────────────────
describe('calcCVaR', () => {
  it('CVaR is always <= VaR (more conservative)', () => {
    const returns = [-0.10, -0.05, 0.02, 0.03, -0.01, 0.04, -0.03, 0.01, 0.02, -0.02]
    expect(calcCVaR(returns, 0.95)).toBeLessThanOrEqual(calcVaR(returns, 0.95))
  })

  it('returns 0 for empty array', () => {
    expect(calcCVaR([], 0.95)).toBe(0)
  })

  it('equals VaR when only one tail observation', () => {
    const returns = [-0.20, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]
    expect(calcCVaR(returns, 0.95)).toBeCloseTo(calcVaR(returns, 0.95))
  })

  it('CVaR is the mean of the tail losses', () => {
    // 10 returns; 5% tail = bottom 1 observation
    const returns = [-0.20, -0.15, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]
    // VaR at 95% = the 5th percentile → index 0 = -0.20
    // CVaR = mean of all returns <= VaR = mean([-0.20]) = -0.20
    expect(calcCVaR(returns, 0.95)).toBeCloseTo(-0.20)
  })

  it('is more negative than VaR when tail has multiple observations', () => {
    // Large tail: 10 returns with 4 losses
    const returns = [-0.10, -0.08, -0.06, -0.04, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06]
    const var95 = calcVaR(returns, 0.95)
    const cvar95 = calcCVaR(returns, 0.95)
    expect(cvar95).toBeLessThanOrEqual(var95)
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
    expect(port[0]).toBeCloseTo(0.02 * 0.6 + 0.01 * 0.4)
    expect(port[1]).toBeCloseTo(-0.01 * 0.6 + 0.02 * 0.4)
    expect(port[2]).toBeCloseTo(0.03 * 0.6 + -0.01 * 0.4)
  })

  it('returns empty array when no symbols', () => {
    expect(calcPortfolioReturns({}, {})).toEqual([])
  })

  it('returns empty array when symbol returns are missing', () => {
    expect(calcPortfolioReturns({}, { AAPL: 0.5 })).toEqual([])
  })

  it('clips to shortest series length', () => {
    const symbolReturns = { A: [0.01, 0.02, 0.03, 0.04], B: [0.01, 0.02] }
    expect(calcPortfolioReturns(symbolReturns, { A: 0.5, B: 0.5 })).toHaveLength(2)
  })

  it('weights summing to 1 produces realistic returns', () => {
    const r = { SPY: [0.01, -0.02, 0.015], QQQ: [-0.005, 0.03, 0.01] }
    const w = { SPY: 0.5, QQQ: 0.5 }
    calcPortfolioReturns(r, w).forEach(ret => {
      expect(Math.abs(ret)).toBeLessThan(0.1)
    })
  })

  it('single-symbol portfolio equals that symbol weighted at 1', () => {
    const r = { AAPL: [0.02, -0.01, 0.03] }
    const port = calcPortfolioReturns(r, { AAPL: 1.0 })
    expect(port[0]).toBeCloseTo(0.02)
    expect(port[1]).toBeCloseTo(-0.01)
    expect(port[2]).toBeCloseTo(0.03)
  })

  it('handles short positions (negative weights)', () => {
    const r = { AAPL: [0.02, -0.01], SPY: [0.01, 0.01] }
    const w = { AAPL: -0.5, SPY: 1.5 } // short AAPL, long SPY
    const port = calcPortfolioReturns(r, w)
    expect(port[0]).toBeCloseTo(-0.5 * 0.02 + 1.5 * 0.01)
    expect(port[1]).toBeCloseTo(-0.5 * (-0.01) + 1.5 * 0.01)
  })

  it('zero weight symbol contributes nothing', () => {
    const r = { AAPL: [0.05, 0.05, 0.05], MSFT: [0.10, 0.10, 0.10] }
    const w = { AAPL: 1.0, MSFT: 0 }
    const port = calcPortfolioReturns(r, w)
    port.forEach(ret => expect(ret).toBeCloseTo(0.05))
  })
})
