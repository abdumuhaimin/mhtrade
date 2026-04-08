import { useEffect, useState } from 'react'
import { registerSymbols, subscribeStore } from '../lib/wsStore'
import type { WsData } from '../lib/wsStore'

export type { Quote, Trade } from '../lib/wsStore'

export function useLivePrices(symbols: string[]) {
  const [data, setData] = useState<WsData>({ quotes: {}, trades: {}, connected: false })

  useEffect(() => {
    if (symbols.length) registerSymbols(symbols)
    return subscribeStore(setData)
  }, [symbols.join(',')])

  return data
}
