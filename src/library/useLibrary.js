import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../session/SessionContext.js'
import { fetchLibrary } from './fetchLibrary.js'
import { onLibraryChanged } from './libraryEvents.js'

const LOADING = { status: 'loading', sounds: [], error: null, retrying: false, stale: false }

// Classmates add sounds and the teacher approves them during a jam, so the
// library is fetched again this often while the tab is visible, and at once
// when this student's own sound is saved or the tab comes back into view.
export const REFRESH_MS = 30_000

// Same sounds in the same places: nothing for the field to redraw.
const sameSounds = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Fetches the class library when the calling component mounts, then keeps it
// fresh. status: 'loading' | 'ready' | 'error'. retry() fetches again after
// an error; while it runs, status stays 'error' with retrying true, so the
// Try again button (and keyboard focus on it) stays put. A failed background
// refresh keeps the sounds already shown and sets stale until one succeeds.
// A 401 means the class code stopped working: the session is expired, and
// nothing is fetched until the student joins again (then it fetches at once).
export function useLibrary() {
  const { classCode, status, expire } = useSession()
  const active = status === 'joined'
  const [state, setState] = useState(LOADING)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    fetchLibrary(classCode).then(
      (sounds) => {
        if (!cancelled) setState({ ...LOADING, status: 'ready', sounds })
      },
      (error) => {
        if (cancelled) return
        if (error.status === 401) expire()
        setState({ ...LOADING, status: 'error', error })
      },
    )
    return () => { cancelled = true }
  }, [classCode, active, expire, attempt])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    function refresh() {
      if (document.visibilityState === 'hidden') return
      fetchLibrary(classCode).then(
        (sounds) => {
          if (cancelled) return
          setState((prev) => {
            if (prev.status !== 'ready') return prev // the first load or a retry is in charge
            if (!prev.stale && sameSounds(prev.sounds, sounds)) return prev
            return { ...prev, sounds, stale: false }
          })
        },
        (error) => {
          if (cancelled) return
          if (error.status === 401) expire()
          setState((prev) => (prev.status !== 'ready' || prev.stale ? prev : { ...prev, stale: true }))
        },
      )
    }
    const timer = setInterval(refresh, REFRESH_MS)
    const stopListening = onLibraryChanged(refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      cancelled = true
      clearInterval(timer)
      stopListening()
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [classCode, active, expire])

  const retry = useCallback(() => {
    setState((prev) => (prev.status === 'error' ? { ...prev, retrying: true } : LOADING))
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
