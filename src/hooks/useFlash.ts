import { useRef, useEffect, useState } from 'react'

export function useFlash(value: number | undefined) {
  const prevRef = useRef<number | undefined>(undefined)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (value === undefined || prevRef.current === undefined) {
      prevRef.current = value
      return
    }
    if (value > prevRef.current) setFlash('up')
    else if (value < prevRef.current) setFlash('down')
    prevRef.current = value

    const t = setTimeout(() => setFlash(null), 800)
    return () => clearTimeout(t)
  }, [value])

  return flash
}
