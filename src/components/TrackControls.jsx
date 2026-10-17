import { useSuperSonic } from '../audio/SuperSonicContext.js'
import { AMP, ATTACK, CUTOFF, OFFSET, RATE, RELEASE, REVERB } from '../audio/limits.js'
import { rateToSemitones, semitonesToRate } from '../audio/tracks.js'
import RangeSlider from './RangeSlider.jsx'

// Pitch moves in whole semitones across the playback-rate range (0.25–4 = ±24).
const SEMITONES = { min: Math.round(rateToSemitones(RATE.min)), max: Math.round(rateToSemitones(RATE.max)) }

const formatSemitones = (st) => `${st > 0 ? '+' : ''}${st} st (×${semitonesToRate(st).toFixed(2)})`
const formatSeconds = (s) => `${s.toFixed(2)} s`
const formatPercent = (amp) => `${Math.round(amp * 100)}%`
const QUARTERS = ['', '¼', '½', '¾']
const formatOffset = (beats) => `Beat ${Math.floor(beats) + 1}${QUARTERS[Math.round((beats % 1) * 4)]}`
const formatCutoff = (note) => {
  if (note >= CUTOFF.max) return 'Open'
  const hz = 440 * 2 ** ((note - 69) / 12)
  return hz < 1000 ? `${Math.round(hz)} Hz` : `${(hz / 1000).toFixed(1)} kHz`
}

// A track's sliders. Cutoff and reverb change what is sounding at once; the
// others are heard from the track's next bar.
export default function TrackControls({ track }) {
  const { updateTrack } = useSuperSonic()
  const set = (patch) => updateTrack(track.id, patch)

  return (
    <div className="track-controls">
      <RangeSlider
        label="Start"
        min={OFFSET.min}
        max={OFFSET.max}
        step={OFFSET.step}
        value={track.offset}
        onChange={(offset) => set({ offset })}
        format={formatOffset}
      />
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
      <RangeSlider
        label="Volume"
        min={AMP.min}
        max={AMP.max}
        step={0.01}
        value={track.amp}
        onChange={(amp) => set({ amp })}
        format={formatPercent}
      />
      <RangeSlider
        label="Cutoff"
        min={CUTOFF.min}
        max={CUTOFF.max}
        step={1}
        value={track.cutoff}
        onChange={(cutoff) => set({ cutoff })}
        format={formatCutoff}
      />
      <RangeSlider
        label="Reverb"
        min={REVERB.min}
        max={REVERB.max}
        step={0.01}
        value={track.reverb}
        onChange={(reverb) => set({ reverb })}
        format={formatPercent}
      />
    </div>
  )
}
