import { useRef } from 'react'
import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import { MAX_TRACKS } from '../../audio/jam.js'
import { quadrantOf } from '../../../shared/quadrants.js'
import TransportControls from '../TransportControls.jsx'
import TrackRow from './TrackRow.jsx'

// BPM and master play/stop, "+ Instrument", and one row per track.
// onArm(on, fromKeyboard) arms or cancels picking a new track.
export default function TrackPanel({ soundsById, armed, onArm, busy }) {
  const { tracks, canAddTrack } = useSuperSonic()
  const headingRef = useRef(null)
  const empty = tracks.length === 0
  const canArm = !empty && !busy && canAddTrack

  return (
    <section className="track-panel" aria-labelledby="track-panel-heading">
      {/* Focus lands here after a track is removed, since its row is gone. */}
      <h3 id="track-panel-heading" ref={headingRef} tabIndex={-1}>Tracks ({tracks.length} of {MAX_TRACKS})</h3>
      <TransportControls />
      <button
        type="button"
        className="add-instrument"
        // detail is 0 when Enter or Space pressed it.
        onClick={(event) => canArm && onArm(!armed, event.detail === 0)}
        aria-disabled={!canArm || undefined}
        aria-label={armed ? 'Cancel adding a track' : undefined}
      >
        {armed ? 'Cancel' : '+ Instrument'}
      </button>
      {!canAddTrack && <p>That’s the most tracks a jam can have. Remove one to add another.</p>}
      {empty ? (
        <p>No tracks yet. Pick a dot on the field to start your first one.</p>
      ) : (
        <ol className="track-list">
          {tracks.map((track) => {
            const sound = soundsById.get(track.soundId)
            return (
              <li key={track.id}>
                <TrackRow
                  track={track}
                  name={sound?.onomatopoeia ?? 'Test sound'}
                  quadrant={sound && (sound.quadrant ?? quadrantOf(sound.finalX, sound.finalY))}
                  onRemoved={() => headingRef.current?.focus()}
                />
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
