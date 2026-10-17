import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../session/SessionContext.js'
import { fetchLibrary } from './fetchLibrary.js'

const LOADING = { status: 'loading', sounds: [], error: null }

// Fetches the class library when the calling component mounts.
// status: 'loading' | 'ready' | 'error'. retry() fetches again.
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

  const retry = useCallback(() => {
    setState(LOADING)
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
