import { useEffect, useState } from 'react'
import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import { useSession } from '../../session/SessionContext.js'
import StepHeading from '../StepHeading.jsx'
import JamLibrary from './JamLibrary.jsx'
import RecordJam from '../record/RecordJam.jsx'

// The Step 2 box opens the jam. The engine may already be running (playing
// a clip in Step 1 starts it), so the jam stays closed until the box is
// clicked, not until the engine is ready. Clicking also starts the engine if
// needed: browsers only start audio after a gesture. If the engine fails,
// the box says why and clicking it tries again.
export default function JamSection() {
  const { status, error, start, playing, stop } = useSuperSonic()
  const session = useSession()
  const [opened, setOpened] = useState(false)
  const showing = opened && status === 'ready'

  // The class code stopped working: stop the loop while the student joins
  // again. The tracks stay.
  const expired = session.status === 'expired'
  useEffect(() => {
    if (expired && playing) stop()
  }, [expired, playing, stop])

  function handleOpen() {
    setOpened(true)
    start() // resolves at once if the engine is already running
  }

  let action = null
  if (!showing) {
    const starting = opened && status === 'loading'
    const failed = opened && status === 'error'
    action = {
      onClick: handleOpen,
      disabled: starting,
      hint: starting ? 'Starting the sound engine…' : failed ? 'Click to try again' : 'Click to start the jam',
    }
  }

  return (
    <>
      <section className="jam">
        {/* The box was the button just pressed; once the jam opens, focus its heading. */}
        <StepHeading step={2} action={action} autoFocus={showing}>Jam</StepHeading>
        {opened && error && <p role="alert" className="error-message">{error.message}</p>}
        {showing && <JamLibrary />}
      </section>
      {/* Step 3 follows the jam once it's open. */}
      {showing && <RecordJam />}
    </>
  )
}
