import { createContext, useContext } from 'react'

export const SuperSonicContext = createContext(null)

// Engine:    status ('idle' | 'loading' | 'ready' | 'error'), error, start,
//            loadSample(bufferNumber, url), playOnce(bufferNumber)
// Tracks:    tracks, addTrack(bufferNumber, overrides) -> id,
//            updateTrack(id, patch), removeTrack(id)   (model in tracks.js)
// Transport: bpm, setBpm, playing, play(), stop()
// Export:    recordBars(n) -> Promise<Blob | null>   (see barRecorder.js)
export function useSuperSonic() {
  const value = useContext(SuperSonicContext)
  if (!value) throw new Error('useSuperSonic must be used inside <SuperSonicProvider>')
  return value
}
