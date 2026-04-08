import { WS_KEY, WS_SECRET } from './alpaca'

export type Quote = { ap: number; bp: number; as: number; bs: number; t: string }
export type Trade = { p: number; s: number; t: string }
export type WsData = {
  quotes:    Record<string, Quote>
  trades:    Record<string, Trade>
  connected: boolean
}

// ── Singleton state ──────────────────────────────────────────────────────────
let ws:             WebSocket | null = null
let authenticated = false
const pending       = new Set<string>()   // symbols registered before auth
let current: WsData = { quotes: {}, trades: {}, connected: false }
const listeners     = new Set<(d: WsData) => void>()

function notify() {
  const snap = { ...current, quotes: { ...current.quotes }, trades: { ...current.trades } }
  listeners.forEach(fn => fn(snap))
}

function send(payload: object) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
  ws = new WebSocket('wss://stream.data.alpaca.markets/v2/iex')

  ws.onopen = () => {
    send({ action: 'auth', key: WS_KEY, secret: WS_SECRET })
  }

  ws.onmessage = (e) => {
    const msgs: any[] = JSON.parse(e.data)
    let dirty = false
    msgs.forEach(msg => {
      if (msg.T === 'success' && msg.msg === 'authenticated') {
        authenticated = true
        current = { ...current, connected: true }
        dirty = true
        // flush pending subscriptions
        const syms = Array.from(pending)
        if (syms.length) send({ action: 'subscribe', quotes: syms, trades: syms })
      }
      if (msg.T === 'error') {
        console.warn('[WS] Alpaca error', msg.code, msg.msg)
        if (msg.code === 406) {
          // Connection limit exceeded — back off and retry after 10s
          ;(ws as any).__onLimit?.()
          ws?.close()
          setTimeout(connect, 10000)
        }
      }
      if (msg.T === 'q') {
        current.quotes = { ...current.quotes, [msg.S]: { ap: msg.ap, bp: msg.bp, as: msg.as, bs: msg.bs, t: msg.t } }
        dirty = true
      }
      if (msg.T === 't') {
        current.trades = { ...current.trades, [msg.S]: { p: msg.p, s: msg.s, t: msg.t } }
        dirty = true
      }
    })
    if (dirty) notify()
  }

  let hitLimit = false
  ws.onerror = () => {}
  ws.onclose = () => {
    authenticated = false
    current = { ...current, connected: false }
    notify()
    if (!hitLimit) setTimeout(connect, 3000)
  }
  // tag the ws so the limit handler can set hitLimit
  ;(ws as any).__onLimit = () => { hitLimit = true }
}

export function registerSymbols(symbols: string[]) {
  const newSyms = symbols.filter(s => !pending.has(s))
  newSyms.forEach(s => pending.add(s))
  if (authenticated && newSyms.length) {
    send({ action: 'subscribe', quotes: newSyms, trades: newSyms })
  }
  connect()
}

export function subscribeStore(fn: (d: WsData) => void): () => void {
  listeners.add(fn)
  fn({ ...current })  // emit current state immediately
  return () => { listeners.delete(fn) }
}
