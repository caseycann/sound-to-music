import { useId, useMemo, useRef } from 'react'
import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import DotField from '../../field/DotField.jsx'
import { useLibrarySamples } from '../../library/useLibrarySamples.js'
import PickPrompt from './PickPrompt.jsx'
import TrackPanel from './TrackPanel.jsx'
import { useJamPicks } from './useJamPicks.js'

// The field and the track panel side by side.
export default function JamBoard({ sounds }) {
  const { usedIds } = useSuperSonic()
  const samples = useLibrarySamples()
  const picks = useJamPicks(samples)
  const fieldRef = useRef(null)
  const hintId = useId()
  // Every sound seen this session, not just the current library: a track
  // keeps its name and colour if its sound later leaves the library (e.g.
  // the teacher rejects it while the track is playing).
  const seenRef = useRef(new Map())
  const soundsById = useMemo(() => {
    for (const s of sounds) seenRef.current.set(s.id, s)
    return new Map(seenRef.current)
  }, [sounds])

  // "+ Instrument" from the keyboard goes straight to the field, where the
  // pick happens. (A mouse user is already pointing at the field.)
  function handleArm(on, fromKeyboard) {
    picks.setArmed(on)
    if (on && fromKeyboard) fieldRef.current?.focus()
  }

  return (
    <div className="jam-board">
      <div className="jam-field">
        <PickPrompt
          picking={picks.picking}
          pending={soundsById.get(picks.pendingId)}
          added={picks.added}
          count={sounds.length}
          hintId={hintId}
        />
        <DotField
          ref={fieldRef}
          sounds={sounds}
          usedIds={usedIds}
          states={samples.loadStates}
          onPick={picks.pick}
          highlight={picks.picking}
          label={picks.picking ? 'Your class’s sounds: pick one for a new track' : 'Your class’s sounds'}
          describedBy={hintId}
        />
        {picks.error && <p role="alert" className="error-message">{picks.error.message}</p>}
      </div>
      <TrackPanel
        soundsById={soundsById}
        armed={picks.armed}
        onArm={handleArm}
        busy={Boolean(picks.pendingId)}
      />
    </div>
  )
}
