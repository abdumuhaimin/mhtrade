import { WS_KEY, WS_SECRET } from './alpaca'

export type Quote = { ap: number; bp: number; as: number; bs: number; t: string }
export type Trade = { p: number; s: number; t: string }
export type WsData = {
  quotes:    Record<string, Quote>
  trades:    Record<string, Trade>
  connected: boolean
}

// ── BroadcastChannel: only ONE tab holds the real WS connection ───────────────
// The "leader" tab owns the WebSocket and broadcasts data to all other tabs.
// If the leader tab closes, another tab takes over after a short delay.
const BC_CHANNEL = 'mhterm_ws'
const LEADER_KEY = 'mhterm_ws_leader'
const LEADER_TTL = 4000   // ms — leader refreshes heartbeat every 2s

let bc: BroadcastChannel | null = null
try { bc = new BroadcastChannel(BC_CHANNEL) } catch {}

// ── Singleton state ───────────────────────────────────────────────────────────
let ws:           WebSocket | null = null
let authenticated = false
let isLeader      = false
let leaderTimer:  ReturnType<typeof setInterval> | null = null
let electTimer:   ReturnType<typeof setTimeout>  | null = null
const pending     = new Set<string>()
let current: WsData = { quotes: {}, trades: {}, connected: false }
const listeners   = new Set<(d: WsData) => void>()

function notify() {
  const snap = { ...current, quotes: { ...current.quotes }, trades: { ...current.trades } }
  listeners.forEach(fn => fn(snap))
}

function send(payload: object) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
}

// ── Leader election ───────────────────────────────────────────────────────────
function claimLeader() {
  isLeader = true
  localStorage.setItem(LEADER_KEY, String(Date.now()))
  // Refresh heartbeat every 2s so other tabs know we're still alive
  if (leaderTimer) clearInterval(leaderTimer)
  leaderTimer = setInterval(() => {
    localStorage.setItem(LEADER_KEY, String(Date.now()))
  }, 2000)
  connectWS()
}

function tryElect() {
  const last = parseInt(localStorage.getItem(LEADER_KEY) || '0', 10)
  if (Date.now() - last > LEADER_TTL) {
    claimLeader()
  } else {
    // Someone else is leader — schedule re-check
    scheduleElection()
  }
}

function scheduleElection() {
  if (electTimer) clearTimeout(electTimer)
  electTimer = setTimeout(tryElect, LEADER_TTL + 500)
}

// ── WebSocket (leader only) ───────────────────────────────────────────────────
function connectWS() {
  if (!isLeader) return
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
        const syms = Array.from(pending)
        if (syms.length) send({ action: 'subscribe', quotes: syms, trades: syms })
        bc?.postMessage({ type: 'connected' })
      }
      if (msg.T === 'error') {
        console.warn('[WS] Alpaca error', msg.code, msg.msg)
        if (msg.code === 406) {
          // Connection limit — we lost leadership, back off
          isLeader = false
          if (leaderTimer) clearInterval(leaderTimer)
          ws?.close()
          scheduleElection()
        }
      }
      if (msg.T === 'q') {
        const q = { ap: msg.ap, bp: msg.bp, as: msg.as, bs: msg.bs, t: msg.t }
        current.quotes = { ...current.quotes, [msg.S]: q }
        dirty = true
        bc?.postMessage({ type: 'q', S: msg.S, data: q })
      }
      if (msg.T === 't') {
        const t = { p: msg.p, s: msg.s, t: msg.t }
        current.trades = { ...current.trades, [msg.S]: t }
        dirty = true
        bc?.postMessage({ type: 't', S: msg.S, data: t })
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
    bc?.postMessage({ type: 'disconnected' })
    if (isLeader && !hitLimit) setTimeout(connectWS, 3000)
  }
  ;(ws as any).__onLimit = () => { hitLimit = true }
}

// ── Non-leader: listen for broadcasts from the leader tab ────────────────────
if (bc) {
  bc.onmessage = (e) => {
    const msg = e.data
    if (!isLeader) {
      if (msg.type === 'connected') {
        current = { ...current, connected: true }
        notify()
      } else if (msg.type === 'disconnected') {
        current = { ...current, connected: false }
        notify()
        scheduleElection()   // leader may have closed — try to take over
      } else if (msg.type === 'q') {
        current.quotes = { ...current.quotes, [msg.S]: msg.data }
        notify()
      } else if (msg.type === 't') {
        current.trades = { ...current.trades, [msg.S]: msg.data }
        notify()
      }
    }
  }
}

// Cleanup on tab close — give up leadership so another tab can take over
window.addEventListener('beforeunload', () => {
  if (isLeader) {
    localStorage.removeItem(LEADER_KEY)
    ws?.close()
    if (leaderTimer) clearInterval(leaderTimer)
  }
  bc?.close()
})

// ── Public API ────────────────────────────────────────────────────────────────
export function registerSymbols(symbols: string[]) {
  const newSyms = symbols.filter(s => !pending.has(s))
  newSyms.forEach(s => pending.add(s))
  if (authenticated && newSyms.length) {
    send({ action: 'subscribe', quotes: newSyms, trades: newSyms })
  }
  // Start election on first call
  if (!isLeader && !electTimer) tryElect()
}

export function subscribeStore(fn: (d: WsData) => void): () => void {
  listeners.add(fn)
  fn({ ...current })
  return () => { listeners.delete(fn) }
}
