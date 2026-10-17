import { useState } from 'react'

// Asks once before removing: a removed track's sound can't be picked again
// this session.
export default function RemoveTrackButton({ name, onRemove }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) return <button onClick={() => setConfirming(true)}>Remove</button>
  return (
    <span className="remove-confirm" role="group" aria-label={`Remove ${name}?`}>
      You can’t add “{name}” again.{' '}
      <button onClick={onRemove} autoFocus>Remove</button>{' '}
      <button onClick={() => setConfirming(false)}>Keep</button>
    </span>
  )
}
