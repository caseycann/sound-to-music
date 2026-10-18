import { useState } from 'react'
import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import { BEATS_PER_BAR, LOOP_BARS } from '../../audio/limits.js'
import { blobToWav } from '../../audio/wav.js'
import { extensionFor } from '../DownloadLink.jsx'
import StepHeading from '../StepHeading.jsx'
import RecordResult from './RecordResult.jsx'

const LENGTHS = [
  { bars: 1, label: '1 bar' },
  { bars: LOOP_BARS, label: `${LOOP_BARS} bars (the whole loop)` },
  { bars: LOOP_BARS * 2, label: `${LOOP_BARS * 2} bars (the loop twice)` },
  { bars: LOOP_BARS * 4, label: `${LOOP_BARS * 4} bars (the loop 4 times)` },
]

// Step 3: record whole bars of the jam and save them as a WAV. Starts the
// loop if it isn't playing. The recording stays in the browser: it is only
// ever downloaded, never uploaded. "Stop all" ends it early and keeps what
// was recorded. The file downloads by itself when it's ready; the player
// and Save link stay as a fallback.
export default function RecordJam() {
  const { tracks, bpm, playing, play, recordBars } = useSuperSonic()
  const [bars, setBars] = useState(LOOP_BARS)
  const [phase, setPhase] = useState('idle') // idle | recording | converting
  const [result, setResult] = useState(null) // { name, original, wav }
  const [error, setError] = useState(null)
  const busy = phase !== 'idle'
  const empty = tracks.length === 0
  const seconds = Math.round(((bars * BEATS_PER_BAR * 60) / bpm) * 10) / 10

  async function handleRecord() {
    if (busy || empty) return
    setError(null)
    setResult(null)
    setPhase('recording')
    try {
      if (!playing) await play()
      const original = await recordBars(bars)
      if (!original) {
        setError(new Error('The jam stopped before the first bar, so nothing was recorded. Try again.'))
        return
      }
      const name = `jam-${timestamp()}`
      setPhase('converting')
      const wav = await blobToWav(original).catch((err) => {
        console.error('WAV conversion failed', err)
        setError(new Error('Couldn’t turn the recording into a WAV file. You can still save it in its original format.'))
        return null
      })
      setResult({ name, original, wav })
      saveFile(wav ?? original, name)
    } catch (err) {
      console.error('Recording failed', err)
      setError(new Error('Recording didn’t work. Press Play all, then try again.'))
    } finally {
      setPhase('idle')
    }
  }

  let status = null
  if (phase === 'recording') status = `Recording ${bars} ${bars === 1 ? 'bar' : 'bars'} (about ${seconds} s)… Stop all ends it early.`
  else if (phase === 'converting') status = 'Making your WAV file…'
  else if (empty) status = 'Add a track to the jam first.'
  else if (result) status = 'Your recording is downloading. If it didn’t, use Save below.'

  return (
    <section className="record-jam">
      <StepHeading step={3}>Record</StepHeading>
      <div className="record-controls">
        <label>
          Length{' '}
          <select value={bars} onChange={(e) => setBars(Number(e.target.value))} disabled={busy}>
            {LENGTHS.map((l) => <option key={l.bars} value={l.bars}>{l.label}</option>)}
          </select>
        </label>
        <button type="button" className="record-button" onClick={handleRecord} aria-disabled={busy || empty || undefined}>
          {phase === 'recording' ? 'Recording…' : phase === 'converting' ? 'Saving…' : '● Record'}
        </button>
      </div>
      <p className="record-note">
        Recording starts on the next bar{playing ? '' : ' (it presses Play all for you)'}. Your recording stays on this
        computer until you save it.
      </p>
      <p role="status" className="record-status">{status}</p>
      {error && <p role="alert" className="error-message">{error.message}</p>}
      {result && !busy && <RecordResult {...result} />}
    </section>
  )
}

// e.g. 2026-10-18-1432, so saved files sort by time. No names: rule 3.
function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}

// Downloads blob as name.<ext> by clicking a temporary link.
function saveFile(blob, name) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.${extensionFor(blob)}`
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before letting go of it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
