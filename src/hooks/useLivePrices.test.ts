import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// vi.hoisted() ensures these run before the vi.mock() factory (which is hoisted too)
const { listeners, mockRegister, mockSubscribe } = vi.hoisted(() => {
  const listeners = new Set<(d: any) => void>()
  const mockRegister = vi.fn()
  const mockSubscribe = vi.fn((fn: (d: any) => void) => {
    listeners.add(fn)
    fn({ quotes: {}, trades: {}, connected: false })
    return () => listeners.delete(fn)
  })
  return { listeners, mockRegister, mockSubscribe }
})

vi.mock('../lib/wsStore', () => ({
  registerSymbols: mockRegister,
  subscribeStore: mockSubscribe,
}))

import { useLivePrices } from './useLivePrices'

describe('useLivePrices', () => {
  beforeEach(() => {
    listeners.clear()
    vi.clearAllMocks()
    mockSubscribe.mockImplementation((fn: (d: any) => void) => {
      listeners.add(fn)
      fn({ quotes: {}, trades: {}, connected: false })
      return () => listeners.delete(fn)
    })
  })

  it('initial state is disconnected with empty quotes and trades', () => {
    const { result } = renderHook(() => useLivePrices(['SPY']))
    expect(result.current.connected).toBe(false)
    expect(result.current.quotes).toEqual({})
    expect(result.current.trades).toEqual({})
  })

  it('calls registerSymbols with provided symbols on mount', () => {
    renderHook(() => useLivePrices(['SPY', 'AAPL']))
    expect(mockRegister).toHaveBeenCalledWith(['SPY', 'AAPL'])
  })

  it('does not call registerSymbols when symbols array is empty', () => {
    renderHook(() => useLivePrices([]))
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('calls subscribeStore once on mount', () => {
    renderHook(() => useLivePrices(['SPY']))
    expect(mockSubscribe).toHaveBeenCalledTimes(1)
  })

  it('updates state when store broadcasts a quote update', () => {
    const { result } = renderHook(() => useLivePrices(['SPY']))
    act(() => {
      listeners.forEach(fn => fn({
        quotes: { SPY: { ap: 450.05, bp: 449.95, as: 100, bs: 100, t: '2024-01-01' } },
        trades: {},
        connected: true,
      }))
    })
    expect(result.current.connected).toBe(true)
    expect(result.current.quotes['SPY']?.ap).toBeCloseTo(450.05)
    expect(result.current.quotes['SPY']?.bp).toBeCloseTo(449.95)
  })

  it('updates state when store broadcasts a trade update', () => {
    const { result } = renderHook(() => useLivePrices(['SPY']))
    act(() => {
      listeners.forEach(fn => fn({
        quotes: {},
        trades: { SPY: { p: 451.0, s: 100, t: '2024-01-01' } },
        connected: true,
      }))
    })
    expect(result.current.trades['SPY']?.p).toBeCloseTo(451.0)
  })

  it('reflects connected=true when store connects', () => {
    const { result } = renderHook(() => useLivePrices(['SPY']))
    expect(result.current.connected).toBe(false)
    act(() => {
      listeners.forEach(fn => fn({ quotes: {}, trades: {}, connected: true }))
    })
    expect(result.current.connected).toBe(true)
  })

  it('unsubscribes from the store on unmount', () => {
    const { unmount } = renderHook(() => useLivePrices(['SPY']))
    expect(listeners.size).toBe(1)
    unmount()
    expect(listeners.size).toBe(0)
  })

  it('re-registers symbols when the symbol list changes', () => {
    const { rerender } = renderHook(
      ({ syms }: { syms: string[] }) => useLivePrices(syms),
      { initialProps: { syms: ['SPY'] } }
    )
    expect(mockRegister).toHaveBeenCalledTimes(1)
    rerender({ syms: ['SPY', 'QQQ'] })
    expect(mockRegister).toHaveBeenCalledTimes(2)
    expect(mockRegister).toHaveBeenLastCalledWith(['SPY', 'QQQ'])
  })
})
