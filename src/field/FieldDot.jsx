import { toPxX, toPxY } from './scale.js'

// One dot on the field. kind: 'student' (solid), or 'claude' / 'audio'
// (ghosts: hollow, with a short label beside them).
export default function FieldDot({ x, y, kind, label }) {
  const cx = toPxX(x)
  const cy = toPxY(y)
  const ghost = kind !== 'student'
  return (
    <g className={`field-dot field-dot-${kind}`} aria-hidden="true">
      <circle cx={cx} cy={cy} r={ghost ? 8 : 10} />
      {label && (
        <text x={cx + 13} y={cy + 4} className="field-dot-label">
          {label}
        </text>
      )}
    </g>
  )
}
