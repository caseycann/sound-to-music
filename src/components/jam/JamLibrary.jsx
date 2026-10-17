import { useLibrary } from '../../library/useLibrary.js'
import JamBoard from './JamBoard.jsx'

// The class library, once it has loaded. Mount only once the audio engine is
// ready: mounting fetches the library, and each sound loads on first use.
export default function JamLibrary() {
  const { status, sounds, error, retry } = useLibrary()

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
        <p role="alert">{error.message}</p>
        <button onClick={retry}>Try again</button>
      </div>
    )
  }
  if (!sounds.length) return <p>Your class has no approved sounds yet. Check back once your teacher has approved some.</p>

  return <JamBoard sounds={sounds} />
}
