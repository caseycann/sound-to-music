import { useMemo } from 'react'
import { sliceMono } from '../../audio/process.js'
import { wavBlob } from '../../audio/wav.js'
import { MAX_SELECTION_S, channelsOf, peakLevel, viewAround } from '../../audio/waveform.js'
import PlayClipButton from './PlayClipButton.jsx'
import WaveformSelector from './WaveformSelector.jsx'
import { formatTime } from './formatTime.js'

// Longer recordings also get a zoomed view of the selection.
const CLOSE_UP_AFTER_S = 10
const CLOSE_UP_PADDING_S = 1.5

export default function SelectionStep({ upload, selection, onSelectionChange, onUse, onPickAnother, processing, error }) {
  const { name, audio } = upload
  const { sampleRate, duration } = audio
  const channels = useMemo(() => channelsOf(audio), [audio])
  const scale = useMemo(() => 1 / (peakLevel(channels) || 1), [channels])

  // Audition the raw selection as the mono mix it will become.
  const getSelectionClip = () => {
    const mono = sliceMono(channels, sampleRate, selection.start, selection.end)
    return { blob: wavBlob([mono], sampleRate), duration: mono.length / sampleRate }
  }

  const shared = { channels, sampleRate, scale, duration, selection, onChange: onSelectionChange }

  return (
    <section>
      <p>
        <strong>{name}</strong> ({formatTime(duration)}). Drag the box to choose up to {MAX_SELECTION_S} seconds.
      </p>
      <WaveformSelector label="Whole recording" view={{ start: 0, end: duration }} {...shared} />
      {duration > CLOSE_UP_AFTER_S && (
        <WaveformSelector label="Close-up" view={viewAround(selection, CLOSE_UP_PADDING_S, duration)} {...shared} />
      )}
      <p>
        Selected {formatTime(selection.start)} to {formatTime(selection.end)} (
        {(selection.end - selection.start).toFixed(1)} s)
      </p>
      <div className="button-row">
        <PlayClipButton label="Play selection" getClip={getSelectionClip} />
        <button type="button" onClick={onUse} disabled={processing}>
          {processing ? 'Cleaning up…' : 'Use this part'}
        </button>
        <button type="button" onClick={onPickAnother} disabled={processing}>Pick a different file</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
