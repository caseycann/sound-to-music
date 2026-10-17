import { useRef, useState } from 'react'
import FieldDot from '../../field/FieldDot.jsx'
import FieldFrame from '../../field/FieldFrame.jsx'
import { quadrantOf } from '../../../shared/quadrants.js'
import { usePointPlacement } from '../../field/usePointPlacement.js'
import { useSession } from '../../session/SessionContext.js'
import { SaveError, saveStudentPosition } from '../../sound/saveSound.js'
import GhostKey from './GhostKey.jsx'
import { formatPoint } from './formatPoint.js'

// The student places their own sound. Once they have put it down, ghost dots
// show where Claude (from their words) and the audio analysis put it; they
// can still move theirs before saving. onPlaced receives the saved { x, y }.
export default function PlaceSound({ saved, onPlaced }) {
  const { classCode, leave } = useSession()
  const svgRef = useRef(null)
  const [point, setPoint] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handlers = usePointPlacement({ svgRef, point, onChange: setPoint, disabled: saving })
  const { words, placement } = saved
  const claude = placement?.claude ?? null
  const audio = placement?.audio ?? saved.audio
  const revealed = point !== null

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      onPlaced(await saveStudentPosition({ classCode, soundId: saved.id, ...point }))
    } catch (err) {
      if (err.status === 401) return leave()
      // 409: already saved (e.g. a double click); keep what the student chose.
      if (err.status === 409) return onPlaced(point)
      console.error('Saving position failed', err)
      setError(err instanceof SaveError ? err.message : 'Something went wrong saving your spot. Try again.')
      setSaving(false)
    }
  }

  return (
    <section className="place-sound" aria-labelledby="place-heading">
      <h2 id="place-heading">Where does “{words.onomatopoeia}” go?</h2>
      <p>
        {revealed
          ? 'Here’s where your words and the sound itself put it. Drag your dot if you change your mind.'
          : 'Click the field where you think your sound belongs.'}
      </p>
      <FieldFrame
        ref={svgRef}
        className="field-placing"
        tabIndex={0}
        role="application"
        aria-label={`Sound field. ${point ? `Your dot is at ${formatPoint(point)}.` : 'Click, or use the arrow keys, to place your dot.'}`}
        {...handlers}
      >
        {revealed && audio && <FieldDot {...audio} kind="audio" label="Sound" />}
        {revealed && claude && <FieldDot {...claude} kind="claude" label="Words" />}
        {point && <FieldDot {...point} kind="student" />}
      </FieldFrame>
      <p role="status" className="place-readout">
        {point ? <>Your spot: <strong>{quadrantOf(point.x, point.y)}</strong> ({formatPoint(point)})</> : ' '}
      </p>
      {revealed && <GhostKey claude={claude} audio={audio} reason={placement?.reason} />}
      <div className="button-row">
        <button type="button" onClick={handleSave} disabled={!point || saving}>
          {saving ? 'Saving…' : 'Save my spot'}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
