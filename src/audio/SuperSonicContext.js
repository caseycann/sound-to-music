import { createContext, useContext } from 'react'

export const SuperSonicContext = createContext(null)

// Engine:    status ('idle' | 'loading' | 'ready' | 'error'), error (its
//            message is written for students), start() -> Promise<boolean>
//            (false if it failed), loadSample(bufferNumber, url),
//            playOnce(bufferNumber)
// Jam:       jam ({ bpm, tracks, usedIds }, see jam.js), tracks, bpm,
//            usedIds (a Set), canAddTrack, addTrack(bufferNumber, overrides)
//            -> id | null, updateTrack(id, patch), removeTrack(id), setBpm
//            (track model in tracks.js)
// Transport: playing, currentBar (0–3 while playing, else null), play(), stop()
// Export:    recordBars(n) -> Promise<Blob | null>   (see barRecorder.js)
export function useSuperSonic() {
  const value = useContext(SuperSonicContext)
  if (!value) throw new Error('useSuperSonic must be used inside <SuperSonicProvider>')
  return value
}
