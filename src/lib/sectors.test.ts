import { describe, it, expect } from 'vitest'
import { getSector } from './sectors'

describe('getSector', () => {
  it('identifies Technology stocks', () => {
    expect(getSector('AAPL')).toBe('Technology')
    expect(getSector('MSFT')).toBe('Technology')
    expect(getSector('NVDA')).toBe('Technology')
    expect(getSector('META')).toBe('Technology')
    expect(getSector('AVGO')).toBe('Technology')
    expect(getSector('PANW')).toBe('Technology')
    expect(getSector('TSM')).toBe('Technology')
  })

  it('identifies Consumer Discretionary stocks', () => {
    expect(getSector('AMZN')).toBe('Consumer Disc')
    expect(getSector('TSLA')).toBe('Consumer Disc')
  })

  it('identifies Financials', () => {
    expect(getSector('AB')).toBe('Financials')
    expect(getSector('JPM')).toBe('Financials')
  })

  it('identifies Healthcare', () => {
    expect(getSector('TEM')).toBe('Healthcare')
    expect(getSector('JNJ')).toBe('Healthcare')
  })

  it('identifies ETFs', () => {
    expect(getSector('SPY')).toBe('ETF')
    expect(getSector('QQQ')).toBe('ETF')
  })

  it('strips option symbol suffix before lookup', () => {
    // TSLA260424P00310000 → base TSLA → Consumer Disc
    expect(getSector('TSLA260424P00310000')).toBe('Consumer Disc')
    expect(getSector('NVDA250117C00500000')).toBe('Technology')
  })

  it('returns Other for unknown symbols', () => {
    expect(getSector('ZZZZ')).toBe('Other')
    expect(getSector('UNKNOWN')).toBe('Other')
  })
})
