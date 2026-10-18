import { useCallback, useEffect, useRef, useState } from 'react'
import { useSuperSonic } from './SuperSonicContext.js'

// Buffer slot for auditioning uploads. Keep jam sounds out of it.
export const PREVIEW_BUFFER = 1

// Plays a short WAV once through SuperSonic, from a Blob or a URL (the URL must
// allow CORS, as Cloudinary's do). play() must be called from a click handler:
// the first call starts the engine. error is a message for students, or null.
export function useClipPlayer() {
  const { start, error: engineError, loadSample, playOnce } = useSuperSonic()
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const play = useCallback(async ({ blob, url, duration }) => {
    clearTimeout(timerRef.current)
    setError(null)
    setPlaying(true)
    if (!(await start())) {
      // The provider has a student-facing reason; it's read below.
      setError('engine')
      setPlaying(false)
      return
    }
    try {
      await loadSample(PREVIEW_BUFFER, url ?? blob)
      playOnce(PREVIEW_BUFFER)
      timerRef.current = setTimeout(() => setPlaying(false), duration * 1000)
    } catch (err) {
      console.error('Preview failed', err)
      setError(url ? 'Couldn’t load that sound. Check your connection and try again.' : 'Couldn’t play the sound. Try again.')
      setPlaying(false)
    }
  }, [start, loadSample, playOnce])

  const message = error === 'engine' ? engineError?.message ?? 'The sound engine didn’t start. Try again.' : error
  return { play, playing, error: message }
}
