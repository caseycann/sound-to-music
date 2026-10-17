import { useCallback, useRef, useState } from 'react'
import { initialJam, jamReducer } from './jam.js'

// jamReducer, plus a ref that always holds the newest state. dispatch updates
// the ref at once, so the bar clock (which runs between renders) sees a new
// track on the very next bar it sends, and callers can read the result.
export function useJam() {
  const [jam, setJam] = useState(initialJam)
  const jamRef = useRef(jam)

  const dispatch = useCallback((action) => {
    jamRef.current = jamReducer(jamRef.current, action)
    setJam(jamRef.current)
    return jamRef.current
  }, [])

  return { jam, jamRef, dispatch }
}
