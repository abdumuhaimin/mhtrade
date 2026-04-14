import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useFlash } from './useFlash'

describe('useFlash', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns null initially (no prior value to compare)', () => {
    const { result } = renderHook(() => useFlash(100))
    expect(result.current).toBeNull()
  })

  it('returns null for undefined value', () => {
    const { result } = renderHook(() => useFlash(undefined))
    expect(result.current).toBeNull()
  })

  it('flashes up when price increases', () => {
    const { result, rerender } = renderHook(({ v }: { v: number }) => useFlash(v), {
      initialProps: { v: 100 },
    })
    act(() => { rerender({ v: 105 }) })
    expect(result.current).toBe('up')
  })

  it('flashes down when price decreases', () => {
    const { result, rerender } = renderHook(({ v }: { v: number }) => useFlash(v), {
      initialProps: { v: 100 },
    })
    act(() => { rerender({ v: 95 }) })
    expect(result.current).toBe('down')
  })

  it('does not flash when price is unchanged', () => {
    const { result, rerender } = renderHook(({ v }: { v: number }) => useFlash(v), {
      initialProps: { v: 100 },
    })
    act(() => { rerender({ v: 100 }) })
    expect(result.current).toBeNull()
  })

  it('flash persists before 800ms elapses', () => {
    const { result, rerender } = renderHook(({ v }: { v: number }) => useFlash(v), {
      initialProps: { v: 100 },
    })
    act(() => { rerender({ v: 110 }) })
    act(() => { vi.advanceTimersByTime(799) })
    expect(result.current).toBe('up')
  })

  it('flash clears exactly at 800ms', () => {
    const { result, rerender } = renderHook(({ v }: { v: number }) => useFlash(v), {
      initialProps: { v: 100 },
    })
    act(() => { rerender({ v: 110 }) })
    act(() => { vi.advanceTimersByTime(800) })
    expect(result.current).toBeNull()
  })

  it('direction updates immediately on rapid price reversal', () => {
    const { result, rerender } = renderHook(({ v }: { v: number }) => useFlash(v), {
      initialProps: { v: 100 },
    })
    act(() => { rerender({ v: 110 }) })
    expect(result.current).toBe('up')
    // Immediately drops back — previous timer cancelled
    act(() => { rerender({ v: 105 }) })
    expect(result.current).toBe('down')
  })

  it('large price jump flashes up correctly', () => {
    const { result, rerender } = renderHook(({ v }: { v: number }) => useFlash(v), {
      initialProps: { v: 10 },
    })
    act(() => { rerender({ v: 1000 }) })
    expect(result.current).toBe('up')
  })

  it('fractional cent increase still flashes up', () => {
    const { result, rerender } = renderHook(({ v }: { v: number }) => useFlash(v), {
      initialProps: { v: 100.00 },
    })
    act(() => { rerender({ v: 100.001 }) })
    expect(result.current).toBe('up')
  })
})
