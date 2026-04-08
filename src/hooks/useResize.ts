import { useCallback, useRef } from 'react'

/** Returns an onMouseDown handler that drags to resize two flex panels. */
export function useResize(
  setSize: (updater: (prev: number) => number) => void,
  direction: 'horizontal' | 'vertical',
  min = 120,
  max = Infinity,
  invert = false,
) {
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const startPos  = direction === 'horizontal' ? e.clientX : e.clientY
    const sibling  = invert
      ? (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement
      : (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement
    const startSize = direction === 'horizontal' ? sibling.offsetWidth : sibling.offsetHeight

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const rawDelta = (direction === 'horizontal' ? ev.clientX : ev.clientY) - startPos
      const delta    = invert ? -rawDelta : rawDelta
      const next     = Math.min(max, Math.max(min, startSize + delta))
      setSize(() => next)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',  onUp)
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor     = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
  }, [direction, min, max, setSize])

  return onMouseDown
}
