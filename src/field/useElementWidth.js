import { useCallback, useEffect, useState } from 'react'

// Width in whole px of the element given the returned ref, kept up to date
// with a ResizeObserver. 0 until it has been measured.
export function useElementWidth() {
  const [node, setNode] = useState(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  const ref = useCallback((el) => setNode(el), [])
  return [ref, width]
}
