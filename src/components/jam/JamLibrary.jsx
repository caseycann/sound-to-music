import { useState } from 'react'
import DotField from '../../field/DotField.jsx'
import { useLibrary } from '../../library/useLibrary.js'
import { useLibrarySamples } from '../../library/useLibrarySamples.js'

// The class library on the field. Mount only once the audio engine is ready:
// mounting fetches the library, and each sound loads on its first click.
export default function JamLibrary() {
  const { status, sounds, error, retry } = useLibrary()
  const { loadStates, play } = useLibrarySamples()
  const [playError, setPlayError] = useState(null)

  async function handlePlay(sound) {
    setPlayError(null)
    try {
      await play(sound)
    } catch (err) {
      console.error('Library sound failed', err)
      setPlayError(err)
    }
  }

  if (status === 'loading') {
    return (
      <div className="library-loading">
        <label htmlFor="library-progress">Loading your class’s sounds…</label>
        <progress id="library-progress" />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div>
        <p role="alert">{error.message}</p>
        <button onClick={retry}>Try again</button>
      </div>
    )
  }
  if (!sounds.length) return <p>Your class has no approved sounds yet. Check back once your teacher has approved some.</p>

  return (
    <div>
      <p>Click a dot to hear it, or Tab to a dot and press Enter. Scroll or use the buttons to zoom; drag to pan. ({sounds.length} {sounds.length === 1 ? 'sound' : 'sounds'})</p>
      <DotField sounds={sounds} states={loadStates} onPick={handlePlay} label="Your class’s sounds" />
      {playError && <p role="alert">Could not play that sound: {playError.message}</p>}
    </div>
  )
}
