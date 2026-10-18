import { useSuperSonic } from '../audio/SuperSonicContext.js'
import { BEATS_PER_BAR, BPM } from '../audio/limits.js'
import RangeSlider from './RangeSlider.jsx'

const barSeconds = (bpm) => Number(((60 / bpm) * BEATS_PER_BAR).toFixed(2))

// BPM and the master play / stop for every track.
export default function TransportControls() {
  const { status, tracks, bpm, setBpm, playing, play, stop } = useSuperSonic()
  const canPlay = status === 'ready' && tracks.length > 0

  return (
    <div className="transport">
      <RangeSlider
        label="BPM"
        min={BPM.min}
        max={BPM.max}
        step={1}
        value={bpm}
        onChange={setBpm}
        note="How long is each bar"
        tip={`Beats per minute. Each bar is ${BEATS_PER_BAR} beats, so more BPM means shorter bars and a faster jam. At ${bpm} BPM a bar lasts ${barSeconds(bpm)} seconds.`}
      />
      {/* The label says what it will do, so no aria-pressed as well. */}
      <button type="button" onClick={playing ? stop : play} disabled={!canPlay}>
        {playing ? 'Stop all' : 'Play all'}
      </button>
    </div>
  )
}
