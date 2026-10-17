import { useState } from 'react'
import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import StepHeading from '../StepHeading.jsx'
import JamLibrary from './JamLibrary.jsx'

// The Step 2 box opens the jam. The engine may already be running (playing
// a clip in Step 1 starts it), so the jam stays closed until the box is
// clicked, not until the engine is ready. Clicking also starts the engine if
// needed: browsers only start audio after a gesture.
export default function JamSection() {
  const { status, error, start } = useSuperSonic()
  const [opened, setOpened] = useState(false)
  const showing = opened && status === 'ready'

  function handleOpen() {
    setOpened(true)
    start() // resolves at once if the engine is already running
  }

  let action = null
  if (!showing) {
    const starting = opened && status === 'loading'
    action = {
      onClick: handleOpen,
      disabled: starting,
      hint: starting ? 'Starting…' : opened && status === 'error' ? 'Click to try again' : 'Click to start the jam',
    }
  }

  return (
    <section className="jam">
      <StepHeading step={2} action={action}>Jam</StepHeading>
      {opened && error && <p role="alert">Audio could not start: {error.message}</p>}
      {showing && <JamLibrary />}
    </section>
  )
}
