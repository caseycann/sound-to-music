import { useRef, useState } from 'react'
import FieldDot from '../../field/FieldDot.jsx'
import FieldFrame from '../../field/FieldFrame.jsx'
import { quadrantOf } from '../../../shared/quadrants.js'
import { usePointPlacement } from '../../field/usePointPlacement.js'
import { useSession } from '../../session/SessionContext.js'
import { saveStudentPosition } from '../../sound/saveSound.js'
import { useFocusOnMount } from '../useFocusOnMount.js'
import GhostKey from './GhostKey.jsx'
import { formatPoint } from './formatPoint.js'

// The student places their own sound. Once they have put it down, ghost dots
// show where Claude (from their words) and the audio analysis put it; they
// can still move theirs before saving. onPlaced receives the saved { x, y }.
// onStartOver is offered if the sound can't be placed at all (it belongs to
// a class the student has since left).
export default function PlaceSound({ saved, onPlaced, onStartOver }) {
  const { classCode, expire } = useSession()
  const svgRef = useRef(null)
  const [point, setPoint] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null) // { message, stuck }
  // "Save sound" was just pressed and is gone.
  const headingRef = useFocusOnMount()

  const handlers = usePointPlacement({ svgRef, point, onChange: setPoint, disabled: saving })
  const { words, placement } = saved
  const claude = placement?.claude ?? null
  const audio = placement?.audio ?? saved.audio
  const revealed = point !== null

  async function handleSave() {
    if (!point || saving) return
    setSaving(true)
    setError(null)
    try {
      onPlaced(await saveStudentPosition({ classCode, soundId: saved.id, ...point }))
    } catch (err) {
      setSaving(false)
      if (err.status === 401) {
        setError({ message: 'Saving stopped because your class code isn’t active. Join again, then press Save my spot.' })
        return expire()
      }
      // 409: already saved (e.g. a double click); keep what the student chose.
      if (err.status === 409) return onPlaced(point)
      console.error('Saving position failed', err)
      setError({
        message: err.message || 'Something went wrong saving your spot. Try again.',
        stuck: err.status === 404,
      })
    }
  }

  return (
    <section className="place-sound" aria-labelledby="place-heading">
      <h2 id="place-heading" ref={headingRef} tabIndex={-1}>Where does “{words.onomatopoeia}” go?</h2>
      <p id="place-help">
        {revealed
          ? 'Here’s where your words and the sound itself put it. Drag your dot, or use the arrow keys, if you change your mind.'
          : 'Click the field where you think your sound belongs, or Tab to it and press an arrow key. Arrow keys move the dot; hold Shift to move it further.'}
      </p>
      <FieldFrame
        ref={svgRef}
        className="field-placing"
        tabIndex={0}
        role="application"
        aria-label={`Sound field. ${point ? `Your dot is in ${quadrantOf(point.x, point.y)}, at ${formatPoint(point)}.` : 'No dot yet.'}`}
        aria-describedby="place-help"
        {...handlers}
      >
        {revealed && audio && <FieldDot {...audio} kind="audio" label="Sound" />}
        {revealed && claude && <FieldDot {...claude} kind="claude" label="Words" />}
        {point && <FieldDot {...point} kind="student" label="You" />}
      </FieldFrame>
      <p role="status" className="place-readout">
        {point ? <>Your spot: <strong>{quadrantOf(point.x, point.y)}</strong> ({formatPoint(point)})</> : ' '}
      </p>
      {revealed && <GhostKey claude={claude} audio={audio} reason={placement?.reason} />}
      <div className="button-row">
        <button type="button" onClick={handleSave} aria-disabled={!point || saving || undefined}>
          {saving ? 'Saving…' : 'Save my spot'}
        </button>
        {error?.stuck && <button type="button" onClick={onStartOver}>Add a different sound</button>}
      </div>
      {error && <p role="alert" className="error-message">{error.message}</p>}
    </section>
  )
}
