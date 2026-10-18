import { useLibrary } from '../../library/useLibrary.js'
import JamBoard from './JamBoard.jsx'

// The class library, once it has loaded. Mount only once the audio engine is
// ready: mounting fetches the library, and each sound loads on first use.
export default function JamLibrary() {
  const { status, sounds, error, retry, retrying, stale } = useLibrary()

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
      <div className="library-error">
        <p role="alert" className="error-message">Couldn’t load your class’s sounds. {error.message}</p>
        <button type="button" onClick={() => !retrying && retry()} aria-disabled={retrying || undefined}>
          {retrying ? 'Trying again…' : 'Try again'}
        </button>
      </div>
    )
  }
  if (!sounds.length) return <p>Your class has no approved sounds yet. Check back once your teacher has approved some.</p>

  return (
    <>
      <JamBoard sounds={sounds} />
      <p role="status" className="library-stale">
        {stale ? 'Couldn’t check for new sounds just now. You can keep jamming; we’ll try again in a moment.' : ''}
      </p>
    </>
  )
}
