import { useEffect, useRef, useState } from 'react'

const HIDE_DELAY = 150 // ms, so the pointer can move from the word onto the box

// Which axis end's tip is showing ('hold' | 'hit' | 'noise' | 'note' | null).
// The four AxisLabels share it, and AxisTips shows the one that is active.
export function useAxisTip() {
  const [active, setActive] = useState(null)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  return {
    active,
    show(end) {
      clearTimeout(timer.current)
      setActive(end)
    },
    hide() {
      clearTimeout(timer.current)
      setActive(null)
    },
    hideSoon() {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setActive(null), HIDE_DELAY)
    },
  }
}
