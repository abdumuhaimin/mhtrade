const MAP: Record<string, string> = {
  // Technology
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', AMD: 'Technology',
  INTC: 'Technology', QCOM: 'Technology', AVGO: 'Technology', TSM: 'Technology',
  PANW: 'Technology', CRWD: 'Technology', FTNT: 'Technology', NET: 'Technology',
  GOOGL: 'Technology', GOOG: 'Technology', META: 'Technology', SNAP: 'Technology',
  // Consumer Discretionary
  AMZN: 'Consumer Disc', TSLA: 'Consumer Disc', NKE: 'Consumer Disc',
  HD: 'Consumer Disc', MCD: 'Consumer Disc', BKNG: 'Consumer Disc',
  // Financials
  JPM: 'Financials', BAC: 'Financials', GS: 'Financials', MS: 'Financials',
  AB: 'Financials', BX: 'Financials', BLK: 'Financials', V: 'Financials', MA: 'Financials',
  // Healthcare
  JNJ: 'Healthcare', PFE: 'Healthcare', UNH: 'Healthcare', TEM: 'Healthcare',
  MRNA: 'Healthcare', ABBV: 'Healthcare', LLY: 'Healthcare',
  // Energy
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy',
  // Communication
  NFLX: 'Communication', DIS: 'Communication', T: 'Communication', VZ: 'Communication',
  // ETFs
  SPY: 'ETF', QQQ: 'ETF', IWM: 'ETF', GLD: 'ETF', TLT: 'ETF', XLK: 'ETF',
}

export function getSector(symbol: string): string {
  const base = symbol.replace(/\d.*/, '')
  return MAP[base] ?? MAP[symbol] ?? 'Other'
}
