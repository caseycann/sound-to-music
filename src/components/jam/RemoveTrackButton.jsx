import { useRef, useState } from 'react'

// Asks once before removing: a removed track's sound can't be picked again
// this session. The confirmation starts on Keep, the safe choice; Keep
// puts focus back on Remove.
export default function RemoveTrackButton({ name, onRemove }) {
  const [confirming, setConfirming] = useState(false)
  const returnFocus = useRef(false)

  if (!confirming) {
    return (
      <button
        type="button"
        aria-label={`Remove ${name}`}
        onClick={() => setConfirming(true)}
        ref={(el) => {
          if (el && returnFocus.current) {
            returnFocus.current = false
            el.focus()
          }
        }}
      >
        Remove
      </button>
    )
  }
  return (
    <span className="remove-confirm" role="group" aria-label={`Remove ${name}?`}>
      You can’t add “{name}” again.{' '}
      <button type="button" onClick={onRemove}>Remove</button>{' '}
      <button
        type="button"
        autoFocus
        onClick={() => {
          returnFocus.current = true
          setConfirming(false)
        }}
      >
        Keep
      </button>
    </span>
  )
}
