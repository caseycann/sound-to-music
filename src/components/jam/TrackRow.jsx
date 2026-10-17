import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import TrackControls from '../TrackControls.jsx'
import BarToggles from './BarToggles.jsx'
import RemoveTrackButton from './RemoveTrackButton.jsx'

export default function TrackRow({ track, name }) {
  const { updateTrack, removeTrack } = useSuperSonic()

  return (
    <fieldset className={track.muted ? 'track-row is-muted' : 'track-row'}>
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
