import { useSuperSonic } from '../audio/SuperSonicContext.js'
import { BPM } from '../audio/limits.js'
import RangeSlider from './RangeSlider.jsx'

export default function TransportControls() {
  const { status, tracks, bpm, setBpm, playing, play, stop } = useSuperSonic()
  const canPlay = status === 'ready' && tracks.length > 0

  return (
    <div>
      <RangeSlider label="BPM" min={BPM.min} max={BPM.max} step={1} value={bpm} onChange={setBpm} />
      <button onClick={playing ? stop : play} disabled={!canPlay} aria-pressed={playing}>
        {playing ? 'Stop loop' : 'Play loop'}
      </button>
    </div>
  )
}
