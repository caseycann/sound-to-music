import { useEffect, useRef, useState } from 'react'
import { useSuperSonic } from '../audio/SuperSonicContext.js'

export const TEST_BUFFER = 0
const TEST_SAMPLE_URL = '/samples/elec_bong.flac' // CC0, see public/samples/CREDITS.md

// Once the engine is ready, loads the test sample and adds one track for it.
export function useTestTrack() {
  const { status, loadSample, addTrack, tracks } = useSuperSonic()
  const [trackId, setTrackId] = useState(null)
  const [error, setError] = useState(null)
  const startedRef = useRef(false) // StrictMode runs effects twice in dev

  useEffect(() => {
    if (status !== 'ready' || startedRef.current) return
    startedRef.current = true
    loadSample(TEST_BUFFER, TEST_SAMPLE_URL)
      .then(() => setTrackId(addTrack(TEST_BUFFER)))
      .catch((err) => {
        console.error('Test sample failed to load', err)
        setError(err)
      })
  }, [status, loadSample, addTrack])

  return { track: tracks.find((t) => t.id === trackId) ?? null, error }
}
