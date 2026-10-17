import { useCallback, useState } from 'react'
import { createTrack } from './tracks.js'

export function useTracks() {
  const [tracks, setTracks] = useState([])

  const addTrack = useCallback((bufferNumber, overrides) => {
    const track = createTrack(bufferNumber, overrides)
    setTracks((prev) => [...prev, track])
    return track.id
  }, [])

  const updateTrack = useCallback((id, patch) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, id } : t)))
  }, [])

  const removeTrack = useCallback((id) => {
    setTracks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { tracks, addTrack, updateTrack, removeTrack }
}
