import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import { MAX_TRACKS } from '../../audio/jam.js'
import TransportControls from '../TransportControls.jsx'
import TrackRow from './TrackRow.jsx'

// BPM and master play/stop, "+ Instrument", and one row per track.
export default function TrackPanel({ soundsById, armed, onArm, busy }) {
  const { tracks, canAddTrack } = useSuperSonic()
  const empty = tracks.length === 0

  return (
    <section className="track-panel" aria-labelledby="track-panel-heading">
      <h3 id="track-panel-heading">Tracks ({tracks.length} of {MAX_TRACKS})</h3>
      <TransportControls />
      <button
        className="add-instrument"
        onClick={() => onArm(!armed)}
        disabled={empty || busy || !canAddTrack}
        aria-pressed={armed}
      >
        {armed ? 'Cancel' : '+ Instrument'}
      </button>
      {!canAddTrack && <p>That’s the most tracks a jam can have. Remove one to add another.</p>}
      {empty ? (
        <p>No tracks yet. Pick a dot on the field to start your first one.</p>
      ) : (
        <ol className="track-list">
          {tracks.map((track) => (
            <li key={track.id}>
              <TrackRow track={track} name={soundsById.get(track.soundId)?.onomatopoeia ?? 'Test sound'} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
