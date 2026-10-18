import { forwardRef, useId } from 'react'
import { PAD } from './useDotField.js'

// Quadrant names sit in the plot's corners and don't move with the zoom.
const CORNERS = [
  { name: 'Whooshes', side: 'left', row: 'top' },
  { name: 'Hums', side: 'right', row: 'top' },
  { name: 'Clicks', side: 'left', row: 'bottom' },
  { name: 'Plinks', side: 'right', row: 'bottom' },
]

// The empty DotField <svg>: React draws the layers and the fixed labels;
// useDotField fills the tints, centre lines and dots and follows the zoom,
// and draws click effects into .dot-field-effects.
//
// The glow filter is only on the corner names, which don't move. The dots
// drift all the time, so they glow with a halo circle instead (index.css).
const DotFieldFrame = forwardRef(function DotFieldFrame({ size, label, describedBy }, ref) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const clipId = `dot-field-clip-${uid}`
  const glowId = `dot-field-glow-${uid}`
  const plot = Math.max(0, size - 2 * PAD)
  const mid = size / 2
  return (
    <svg ref={ref} className="dot-field-svg" width={size} height={size} role="group" aria-label={label} aria-describedby={describedBy}>
      <defs>
        <clipPath id={clipId}>
          <rect x={PAD} y={PAD} width={plot} height={plot} />
        </clipPath>
        <filter id={glowId} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x={PAD} y={PAD} width={plot} height={plot} className="dot-field-bg" />
      <g clipPath={`url(#${clipId})`}>
        <g className="dot-field-tints" aria-hidden="true" />
        <line className="dot-field-center dot-field-center-x" aria-hidden="true" />
        <line className="dot-field-center dot-field-center-y" aria-hidden="true" />
        <g className="dot-field-dots" />
        <g className="dot-field-effects" aria-hidden="true" />
      </g>
      <g className="dot-field-corners" aria-hidden="true" filter={`url(#${glowId})`}>
        {CORNERS.map((c) => (
          <text
            key={c.name}
            className={`q-${c.name.toLowerCase()}`}
            x={c.side === 'left' ? PAD + 10 : size - PAD - 10}
            y={c.row === 'top' ? PAD + 20 : size - PAD - 12}
            textAnchor={c.side === 'left' ? 'start' : 'end'}
          >
            {c.name}
          </text>
        ))}
      </g>
      <g className="dot-field-ends" aria-hidden="true">
        <text x={mid} y={PAD - 10} textAnchor="middle">Hold ↑</text>
        <text x={mid} y={size - 9} textAnchor="middle">Hit ↓</text>
        <text x={PAD} y={size - 9} textAnchor="start">← Noise</text>
        <text x={size - PAD} y={size - 9} textAnchor="end">Note →</text>
      </g>
    </svg>
  )
})

export default DotFieldFrame
