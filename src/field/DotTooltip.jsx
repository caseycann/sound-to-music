// The words for the dot under the pointer or keyboard focus. Screen readers
// get the same words from the dot's aria-label, so this is hidden from them.
// left/top: the dot's position in px. Shown above the dot, or below it near
// the top edge.
export default function DotTooltip({ sound, used, left, top, fieldSize }) {
  const below = top < 64
  const x = Math.min(Math.max(left, 70), fieldSize - 70) // keep it inside the field
  return (
    <div
      className={`dot-tooltip${below ? ' is-below' : ''}`}
      style={{ left: x, top: below ? top + 14 : top - 14 }}
      aria-hidden="true"
    >
      <strong>{sound.onomatopoeia}</strong>
      <span>{sound.descriptors.join(' · ')}</span>
      {used && <em>used</em>}
    </div>
  )
}
