import { useSuperSonic } from '../audio/SuperSonicContext.js'
import { ATTACK, RATE, RELEASE } from '../audio/limits.js'
import { rateToSemitones, semitonesToRate } from '../audio/tracks.js'
import RangeSlider from './RangeSlider.jsx'

// Pitch moves in whole semitones across the playback-rate range (0.25–4 = ±24).
const SEMITONES = { min: Math.round(rateToSemitones(RATE.min)), max: Math.round(rateToSemitones(RATE.max)) }

const formatSemitones = (st) => `${st > 0 ? '+' : ''}${st} st (×${semitonesToRate(st).toFixed(2)})`
const formatSeconds = (s) => `${s.toFixed(2)} s`

export default function TrackControls({ track }) {
  const { updateTrack } = useSuperSonic()
  const set = (patch) => updateTrack(track.id, patch)

  return (
    <fieldset>
      <legend>Track (buffer {track.bufferNumber})</legend>
      <RangeSlider
        label="Pitch"
        min={SEMITONES.min}
        max={SEMITONES.max}
        step={1}
        value={Math.round(rateToSemitones(track.rate))}
        onChange={(st) => set({ rate: semitonesToRate(st) })}
        format={formatSemitones}
      />
      <RangeSlider
        label="Attack"
        min={ATTACK.min}
        max={ATTACK.max}
        step={0.01}
        value={track.attack}
        onChange={(attack) => set({ attack })}
        format={formatSeconds}
      />
      <RangeSlider
        label="Release"
        min={RELEASE.min}
        max={RELEASE.max}
        step={0.01}
        value={track.release}
        onChange={(release) => set({ release })}
        format={formatSeconds}
      />
    </fieldset>
  )
}
