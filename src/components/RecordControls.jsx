import { useState } from 'react'
import { useSuperSonic } from '../audio/SuperSonicContext.js'
import { blobToWav } from '../audio/wav.js'
import DownloadLink from './DownloadLink.jsx'

const BAR_CHOICES = [1, 2, 4, 8]

const LABELS = {
  idle: 'Record',
  recording: 'Recording…',
  converting: 'Making WAV…',
}

export default function RecordControls() {
  const { playing, recordBars } = useSuperSonic()
  const [bars, setBars] = useState(4)
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null) // { name, original, wav }
  const [error, setError] = useState(null)

  async function handleRecord() {
    setError(null)
    setResult(null)
    setPhase('recording')
    try {
      const original = await recordBars(bars)
      if (!original) return
      const name = `jam-${bars}-bars`
      setResult({ name, original, wav: null })
      setPhase('converting')
      const wav = await blobToWav(original).catch((err) => {
        console.error('WAV conversion failed', err)
        setError(new Error('Could not make a WAV; the original recording is still available.'))
        return null
      })
      setResult({ name, original, wav })
    } catch (err) {
      console.error('Recording failed', err)
      setError(err)
    } finally {
      setPhase('idle')
    }
  }

  return (
    <fieldset>
      <legend>Record</legend>
      <label>
        Bars{' '}
        <select value={bars} onChange={(e) => setBars(Number(e.target.value))} disabled={phase !== 'idle'}>
          {BAR_CHOICES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>{' '}
      <button onClick={handleRecord} disabled={!playing || phase !== 'idle'}>{LABELS[phase]}</button>
      {!playing && phase === 'idle' && <span> Play the loop to record.</span>}
      {error && <p role="alert">{error.message}</p>}
      {result && (
        <p>
          {result.wav && <DownloadLink blob={result.wav} name={result.name} label="Download WAV" />}
          {result.wav && ' · '}
          <DownloadLink blob={result.original} name={result.name} label="Download original" />
        </p>
      )}
    </fieldset>
  )
}
