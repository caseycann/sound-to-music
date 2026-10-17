// The line above the field that says what a click will do.
export default function PickPrompt({ picking, pending, count }) {
  let text
  if (pending) text = `Adding “${pending.onomatopoeia}”…`
  else if (picking) text = 'Pick a sound for a new track. It starts on the next bar.'
  else text = 'Click a dot to hear it. Press “+ Instrument” to add it as a track.'

  return (
    <p className={picking ? 'pick-prompt is-picking' : 'pick-prompt'}>
      <span role="status">{text}</span>{' '}
      <span className="pick-prompt-hint">
        Tab to a dot and press Enter; scroll or use the buttons to zoom, drag to pan. ({count} {count === 1 ? 'sound' : 'sounds'})
      </span>
    </p>
  )
}
