import { describe, it, expect } from 'vitest'
import { getSector } from './sectors'

describe('getSector', () => {
  it('identifies Technology stocks', () => {
    for (const sym of ['AAPL', 'MSFT', 'NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'TSM', 'PANW', 'CRWD', 'GOOGL', 'GOOG', 'META']) {
      expect(getSector(sym), sym).toBe('Technology')
    }
  })

  it('identifies Consumer Discretionary stocks', () => {
    for (const sym of ['AMZN', 'TSLA', 'NKE', 'HD', 'MCD', 'BKNG']) {
      expect(getSector(sym), sym).toBe('Consumer Disc')
    }
  })

  it('identifies Financials', () => {
    for (const sym of ['JPM', 'BAC', 'GS', 'MS', 'AB', 'BX', 'BLK', 'V', 'MA']) {
      expect(getSector(sym), sym).toBe('Financials')
    }
  })

  it('identifies Healthcare', () => {
    for (const sym of ['JNJ', 'PFE', 'UNH', 'TEM', 'MRNA', 'ABBV', 'LLY']) {
      expect(getSector(sym), sym).toBe('Healthcare')
    }
  })

  it('identifies Energy', () => {
    for (const sym of ['XOM', 'CVX', 'COP']) {
      expect(getSector(sym), sym).toBe('Energy')
    }
  })

  it('identifies Communication', () => {
    for (const sym of ['NFLX', 'DIS', 'T', 'VZ']) {
      expect(getSector(sym), sym).toBe('Communication')
    }
  })

  it('identifies ETFs (including all benchmark options)', () => {
    for (const sym of ['SPY', 'QQQ', 'IWM', 'GLD', 'TLT', 'XLK']) {
      expect(getSector(sym), sym).toBe('ETF')
    }
  })

  it('strips option symbol numeric suffix before lookup', () => {
    expect(getSector('TSLA260424P00310000')).toBe('Consumer Disc')
    expect(getSector('NVDA250117C00500000')).toBe('Technology')
    expect(getSector('AAPL241220C00200000')).toBe('Technology')
    expect(getSector('SPY251219P00450000')).toBe('ETF')
  })

  it('returns Other for unknown symbols', () => {
    expect(getSector('ZZZZ')).toBe('Other')
    expect(getSector('UNKNOWN')).toBe('Other')
    expect(getSector('XYZ')).toBe('Other')
  })

  it('handles empty string gracefully', () => {
    // Empty string has no numeric suffix to strip; MAP[''] is undefined → 'Other'
    expect(getSector('')).toBe('Other')
  })

  it('is case-sensitive (symbols are uppercase)', () => {
    // The map uses uppercase keys; lowercase shouldn't match
    expect(getSector('aapl')).toBe('Other')
  })
})
