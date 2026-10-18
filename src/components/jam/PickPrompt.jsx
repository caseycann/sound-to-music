// The line above the field that says what a click will do, and confirms a
// new track (screen readers hear it: it's a status).
export default function PickPrompt({ picking, pending, added, count, hintId }) {
  let text
  if (pending) text = `Adding “${pending.onomatopoeia}”…`
  else if (picking) text = 'Pick a sound for a new track. It starts on the next bar.'
  else if (added) text = `“${added.onomatopoeia}” added as a track. Click a dot to hear it, or press “+ Instrument” for another track.`
  else text = 'Click a dot to hear it. Press “+ Instrument” to add it as a track.'

  return (
    <p className={picking ? 'pick-prompt is-picking' : 'pick-prompt'}>
      <span role="status">{text}</span>{' '}
      {/* Not shown, but the field's aria-describedby reads it to screen readers. */}
      <span className="visually-hidden" id={hintId}>
        Keyboard: Tab to the field, arrow keys move between dots, Enter picks, + and − zoom, 0 resets.
        Mouse: scroll or use the buttons to zoom, drag to pan. ({count} {count === 1 ? 'sound' : 'sounds'})
      </span>
    </p>
  )
}
