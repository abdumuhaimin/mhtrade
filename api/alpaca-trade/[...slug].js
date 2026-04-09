export const config = { runtime: 'edge' }

export default async function handler(req) {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/alpaca-trade/, '')
  const target = `https://paper-api.alpaca.markets${path}${url.search}`

  const res = await fetch(target, {
    method: req.method,
    headers: {
      'APCA-API-KEY-ID':     process.env.VITE_ALPACA_KEY    ?? '',
      'APCA-API-SECRET-KEY': process.env.VITE_ALPACA_SECRET ?? '',
      'Content-Type':        'application/json',
    },
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
  })

  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
