import { describe, it, expect } from 'vitest'

// Tests for the live-price safety guard logic used in PriceChart.
// We extract and test the pure calculation in isolation.

function computeLivePrice(
  trade: { p: number } | undefined,
  quote: { ap: number; bp: number } | undefined
): number | null {
  const mid = quote?.ap && quote?.bp
    ? (quote.ap + quote.bp) / 2
    : (quote?.ap || quote?.bp) || 0
  const livePrice = trade?.p || mid
  if (!livePrice || livePrice <= 0) return null
  return livePrice
}

function isSanePrice(livePrice: number, refPrice: number): boolean {
  if (refPrice <= 0) return true
  return livePrice >= refPrice * 0.7 && livePrice <= refPrice * 1.3
}

describe('live price calculation', () => {
  it('uses trade price when available', () => {
    expect(computeLivePrice({ p: 350.50 }, { ap: 350.52, bp: 350.48 })).toBeCloseTo(350.50)
  })

  it('falls back to bid/ask midpoint when no trade', () => {
    expect(computeLivePrice(undefined, { ap: 350.52, bp: 350.48 })).toBeCloseTo(350.50)
  })

  it('uses ask when bid is zero (|| not ?? fix)', () => {
    // Bug was: 0 ?? 350.52 = 0. Fix: 0 || 350.52 = 350.52
    expect(computeLivePrice(undefined, { ap: 350.52, bp: 0 })).toBeCloseTo(350.52)
  })

  it('uses bid when ask is zero', () => {
    expect(computeLivePrice(undefined, { ap: 0, bp: 350.48 })).toBeCloseTo(350.48)
  })

  it('returns null when both sides are zero', () => {
    expect(computeLivePrice(undefined, { ap: 0, bp: 0 })).toBeNull()
  })

  it('returns null when trade price is zero', () => {
    expect(computeLivePrice({ p: 0 }, { ap: 0, bp: 0 })).toBeNull()
  })

  it('returns null when everything is undefined', () => {
    expect(computeLivePrice(undefined, undefined)).toBeNull()
  })

  it('falls back to mid when trade price is 0 but quote is valid', () => {
    // trade.p = 0 is falsy, so || falls through to mid
    expect(computeLivePrice({ p: 0 }, { ap: 350.52, bp: 350.48 })).toBeCloseTo(350.50)
  })
})

describe('sanity check (±30% guard)', () => {
  it('accepts price within 30% of reference', () => {
    expect(isSanePrice(350, 300)).toBe(true)   // +16.7%
    expect(isSanePrice(250, 300)).toBe(true)   // -16.7%
    expect(isSanePrice(300, 300)).toBe(true)   // 0%
  })

  it('rejects price more than 30% above reference', () => {
    expect(isSanePrice(400, 300)).toBe(false)  // +33%
    expect(isSanePrice(1, 300)).toBe(false)    // near-zero (the big red candle bug)
  })

  it('rejects price more than 30% below reference', () => {
    expect(isSanePrice(200, 300)).toBe(false)  // -33%
  })

  it('accepts anything when reference price is zero or negative', () => {
    expect(isSanePrice(350, 0)).toBe(true)
    expect(isSanePrice(350, -1)).toBe(true)
  })
})
