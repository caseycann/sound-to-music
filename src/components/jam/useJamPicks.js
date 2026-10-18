import { useState } from 'react'
import { useSuperSonic } from '../../audio/SuperSonicContext.js'

// What a click on the field does. While the field is picking (no tracks yet,
// or "+ Instrument" was pressed), a pick loads the sound, adds a track for it
// (which marks it used) and starts the shared clock, so the track comes in
// on the next bar. Otherwise a pick just plays the sound once, to audition it.
//
// samples is useLibrarySamples(). Returns { picking, pendingId, armed,
// setArmed, pick, error, added }; error is { action: 'add' | 'play', message }
// (written for students), and added is the last sound added as a track.
export function useJamPicks(samples) {
  const { tracks, canAddTrack, addTrack, play } = useSuperSonic()
  const [armed, setArmed] = useState(false)
  const [pendingId, setPendingId] = useState(null) // sound being added
  const [error, setError] = useState(null)
  const [added, setAdded] = useState(null)
  const picking = canAddTrack && !pendingId && (armed || tracks.length === 0)

  async function pick(sound) {
    setError(null)
    setAdded(null)
    if (!picking) {
      try {
        await samples.play(sound)
      } catch (err) {
        console.error('Library sound failed', err)
        setError({ action: 'play', message: pickFailure(sound, err) })
      }
      return
    }

    setArmed(false)
    setPendingId(sound.id)
    try {
      const bufferNumber = await samples.ensureLoaded(sound)
      if (addTrack(bufferNumber, { soundId: sound.id })) {
        setAdded(sound)
        await play()
      }
    } catch (err) {
      console.error('Could not add a track', err)
      setError({ action: 'add', message: pickFailure(sound, err) })
      setArmed(true) // let them pick another sound
    } finally {
      setPendingId(null)
    }
  }

  return { picking, pendingId, armed, setArmed, pick, error, added }
}

function pickFailure(sound, err) {
  if (/Too many sounds/.test(err?.message ?? '')) return err.message
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  return offline
    ? `“${sound.onomatopoeia}” didn’t load because you’re offline. Check your Wi-Fi, then pick it again.`
    : `“${sound.onomatopoeia}” didn’t load. Pick it again to retry, or choose another sound.`
}
