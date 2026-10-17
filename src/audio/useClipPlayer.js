import { useCallback, useEffect, useRef, useState } from 'react'
import { useSuperSonic } from './SuperSonicContext.js'

// Buffer slot for auditioning uploads. Keep jam sounds out of it.
export const PREVIEW_BUFFER = 1

// Plays a short WAV once through SuperSonic, from a Blob or a URL (the URL must
// allow CORS, as Cloudinary's do). play() must be called from a click handler:
// the first call starts the engine.
export function useClipPlayer() {
  const { start, loadSample, playOnce } = useSuperSonic()
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const play = useCallback(async ({ blob, url, duration }) => {
    clearTimeout(timerRef.current)
    setError(null)
    setPlaying(true)
    try {
      await start() // resolves at once if already running
      await loadSample(PREVIEW_BUFFER, url ?? blob)
      playOnce(PREVIEW_BUFFER)
      timerRef.current = setTimeout(() => setPlaying(false), duration * 1000)
    } catch (err) {
      console.error('Preview failed', err)
      setError(err)
      setPlaying(false)
    }
  }, [start, loadSample, playOnce])

  return { play, playing, error }
}
