import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../session/SessionContext.js'
import { fetchLibrary } from './fetchLibrary.js'
import { onLibraryChanged } from './libraryEvents.js'

const LOADING = { status: 'loading', sounds: [], error: null }

// Classmates add sounds and the teacher approves them during a jam, so the
// library is fetched again this often while the tab is visible, and at once
// when this student's own sound is saved or the tab comes back into view.
export const REFRESH_MS = 30_000

// Same sounds in the same places: nothing for the field to redraw.
const sameSounds = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Fetches the class library when the calling component mounts, then keeps it
// fresh. status: 'loading' | 'ready' | 'error'. retry() fetches again after
// an error. A failed background refresh keeps the sounds already shown.
export function useLibrary() {
  const { classCode, leave } = useSession()
  const [state, setState] = useState(LOADING)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchLibrary(classCode).then(
      (sounds) => {
        if (!cancelled) setState({ status: 'ready', sounds, error: null })
      },
      (error) => {
        if (cancelled) return
        if (error.status === 401) leave()
        else setState({ status: 'error', sounds: [], error })
      },
    )
    return () => { cancelled = true }
  }, [classCode, leave, attempt])

  useEffect(() => {
    let cancelled = false
    function refresh() {
      if (document.visibilityState === 'hidden') return
      fetchLibrary(classCode).then(
        (sounds) => {
          if (cancelled) return
          setState((prev) => {
            if (prev.status !== 'ready') return prev // the first load or a retry is in charge
            return sameSounds(prev.sounds, sounds) ? prev : { status: 'ready', sounds, error: null }
          })
        },
        (error) => {
          if (!cancelled && error.status === 401) leave()
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
  }, [classCode, leave])

  const retry = useCallback(() => {
    setState(LOADING)
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
