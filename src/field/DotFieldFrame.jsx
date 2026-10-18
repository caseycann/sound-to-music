import { forwardRef, useId } from 'react'
import CornerNames from './CornerNames.jsx'
import { PAD } from './useDotField.js'

// The empty DotField <svg>: React draws the layers and the fixed labels;
// useDotField fills the tints, centre lines and dots and follows the zoom,
// and draws click effects into .dot-field-effects.
//
// The glow filter is only on the corner names (CornerNames), which don't
// move with the zoom. The dots drift all the time, so they glow with a halo
// circle instead (index.css).
const DotFieldFrame = forwardRef(function DotFieldFrame({ size, label, describedBy }, ref) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const clipId = `dot-field-clip-${uid}`
  const glowId = `dot-field-glow-${uid}`
  const plot = Math.max(0, size - 2 * PAD)
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
      <CornerNames size={size} pad={PAD} filter={`url(#${glowId})`} />
    </svg>
  )
})

export default DotFieldFrame
