import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import TrackControls from '../TrackControls.jsx'
import BarToggles from './BarToggles.jsx'
import RemoveTrackButton from './RemoveTrackButton.jsx'

// quadrant colours the row (see index.css); the test sound has none.
export default function TrackRow({ track, name, quadrant }) {
  const { updateTrack, removeTrack } = useSuperSonic()
  const classes = ['track-row', quadrant && `q-${quadrant.toLowerCase()}`, track.muted && 'is-muted']

  return (
    <fieldset className={classes.filter(Boolean).join(' ')}>
      <legend>{name}</legend>
      <div className="track-row-buttons">
        <button onClick={() => updateTrack(track.id, { muted: !track.muted })} aria-pressed={track.muted}>
          {track.muted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={() => updateTrack(track.id, { loop: !track.loop })} aria-pressed={track.loop}>
          Loop whole bar
        </button>
        <RemoveTrackButton name={name} onRemove={() => removeTrack(track.id)} />
      </div>
      <BarToggles bars={track.bars} onChange={(bars) => updateTrack(track.id, { bars })} />
      <TrackControls track={track} />
    </fieldset>
  )
}
