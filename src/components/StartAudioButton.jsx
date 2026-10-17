import { useSuperSonic } from '../audio/SuperSonicContext.js'

const LABELS = {
  idle: 'Start',
  loading: 'Starting…',
  ready: 'Audio ready',
  error: 'Try again',
}

export default function StartAudioButton() {
  const { status, error, start } = useSuperSonic()

  return (
    <div>
      <button onClick={start} disabled={status === 'loading' || status === 'ready'}>
        {LABELS[status]}
      </button>
      {error && <p role="alert">Audio could not start: {error.message}</p>}
    </div>
  )
}
