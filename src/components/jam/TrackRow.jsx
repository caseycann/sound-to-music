import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import TrackControls from '../TrackControls.jsx'
import BarToggles from './BarToggles.jsx'
import RemoveTrackButton from './RemoveTrackButton.jsx'

// quadrant colours the row (see index.css) and is also written in the
// legend, so the colour is never the only clue; the test sound has none.
// onRemoved runs after the track is removed, to move focus somewhere.
export default function TrackRow({ track, name, quadrant, onRemoved }) {
  const { updateTrack, removeTrack } = useSuperSonic()
  const classes = ['track-row', quadrant && `q-${quadrant.toLowerCase()}`, track.muted && 'is-muted']

  return (
    <fieldset className={classes.filter(Boolean).join(' ')}>
      <legend>
        {name}
        {quadrant && <span className="track-row-tag">{quadrant}</span>}
        {track.muted && <span className="track-row-tag is-muted-tag">muted</span>}
      </legend>
      <div className="track-row-buttons">
        {/* Fixed labels: aria-pressed says whether each is on. */}
        <button type="button" onClick={() => updateTrack(track.id, { muted: !track.muted })} aria-pressed={track.muted}>
          Mute
        </button>
        <button type="button" onClick={() => updateTrack(track.id, { loop: !track.loop })} aria-pressed={track.loop}>
          Loop whole bar
        </button>
        <RemoveTrackButton
          name={name}
          onRemove={() => {
            removeTrack(track.id)
            onRemoved?.()
          }}
        />
      </div>
      <BarToggles bars={track.bars} onChange={(bars) => updateTrack(track.id, { bars })} />
      <TrackControls track={track} />
    </fieldset>
  )
}
