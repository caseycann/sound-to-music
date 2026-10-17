import { forwardRef } from 'react'
import { QUADRANTS } from '../../shared/quadrants.js'
import { PAD, SIZE, toPxX, toPxY } from './scale.js'

const GRID = [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75]

// The empty field: background, grid, axes and labels. Dots go in children.
// Other props (handlers, tabIndex, aria-*) go on the <svg>.
const FieldFrame = forwardRef(function FieldFrame({ children, className = '', ...svgProps }, ref) {
  const mid = SIZE / 2
  return (
    <svg ref={ref} className={`field ${className}`} viewBox={`0 0 ${SIZE} ${SIZE}`} {...svgProps}>
      <rect x={PAD} y={PAD} width={SIZE - 2 * PAD} height={SIZE - 2 * PAD} className="field-bg" />
      {GRID.map((v) => (
        <g key={v} className="field-grid">
          <line x1={toPxX(v)} x2={toPxX(v)} y1={PAD} y2={SIZE - PAD} />
          <line x1={PAD} x2={SIZE - PAD} y1={toPxY(v)} y2={toPxY(v)} />
        </g>
      ))}
      <line x1={PAD} x2={SIZE - PAD} y1={mid} y2={mid} className="field-axis" />
      <line x1={mid} x2={mid} y1={PAD} y2={SIZE - PAD} className="field-axis" />
      {QUADRANTS.map((q) => (
        <text key={q.name} x={toPxX(q.x * 0.5)} y={toPxY(q.y * 0.5)} className="field-quadrant">
          {q.name}
        </text>
      ))}
      <text x={SIZE - PAD} y={mid - 6} className="field-end" textAnchor="end">Note →</text>
      <text x={PAD} y={mid - 6} className="field-end" textAnchor="start">← Noise</text>
      <text x={mid} y={PAD - 10} className="field-end">Hold ↑</text>
      <text x={mid} y={SIZE - PAD + 20} className="field-end">Hit ↓</text>
      {children}
    </svg>
  )
})

export default FieldFrame
