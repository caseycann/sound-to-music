import { useState } from 'react'
import { useSuperSonic } from '../audio/SuperSonicContext.js'

export default function PlayTestSoundButton({ bufferNumber, disabled }) {
  const { playOnce } = useSuperSonic()
  const [error, setError] = useState(null)

  function handleClick() {
    setError(null)
    try {
      playOnce(bufferNumber)
    } catch (err) {
      console.error('Test sound failed', err)
      setError(err)
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={disabled}>Play test sound</button>
      {error && <p role="alert">Could not play: {error.message}</p>}
    </div>
  )
}
