export function dailyReturns(closes: number[]): number[] {
  const ret: number[] = []
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] !== 0) ret.push((closes[i] - closes[i - 1]) / closes[i - 1])
  }
  return ret
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length
}

function covariance(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0
  const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n))
  let sum = 0
  for (let i = 0; i < n; i++) sum += (x[i] - mx) * (y[i] - my)
  return sum / n
}

export function calcBeta(posReturns: number[], mktReturns: number[]): number {
  const v = variance(mktReturns)
  return v === 0 ? 1 : covariance(posReturns, mktReturns) / v
}

export function calcCorrelation(x: number[], y: number[]): number {
  const cov = covariance(x, y)
  const sx = Math.sqrt(variance(x)), sy = Math.sqrt(variance(y))
  return sx === 0 || sy === 0 ? 0 : cov / (sx * sy)
}

export function calcVaR(returns: number[], confidence = 0.95): number {
  if (!returns.length) return 0
  const sorted = [...returns].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.floor((1 - confidence) * sorted.length))]
}

export function calcCVaR(returns: number[], confidence = 0.95): number {
  if (!returns.length) return 0
  const v = calcVaR(returns, confidence)
  const tail = returns.filter(r => r <= v)
  return tail.length ? mean(tail) : v
}

export function calcPortfolioReturns(
  symbolReturns: Record<string, number[]>,
  weights: Record<string, number>,
): number[] {
  const syms = Object.keys(weights).filter(s => (symbolReturns[s]?.length ?? 0) > 0)
  if (!syms.length) return []
  const n = Math.min(...syms.map(s => symbolReturns[s].length))
  if (n === 0) return []
  return Array.from({ length: n }, (_, i) =>
    syms.reduce((r, s) => r + (weights[s] ?? 0) * symbolReturns[s][i], 0)
  )
}
