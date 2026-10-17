import { useState } from 'react'
import { toCoordinate } from '../../shared/position.js'
import { SIZE, toPxX, toPxY } from './scale.js'

const STEP = 0.01
const BIG_STEP = 0.1 // with Shift

// Click or drag on the field's <svg> to put a point there; arrow keys nudge
// it (the first key press starts it in the centre). Points are snapped to
// two decimals. point is null until the student places it.
export function usePointPlacement({ svgRef, point, onChange, disabled }) {
  const [dragging, setDragging] = useState(false)

  const pointAt = (event) => {
    const rect = svgRef.current.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * SIZE
    const py = ((event.clientY - rect.top) / rect.height) * SIZE
    return { x: toCoordinate(toPxX.invert(px)), y: toCoordinate(toPxY.invert(py)) }
  }

  const onPointerDown = (event) => {
    if (disabled || event.button !== 0) return
    event.preventDefault()
    svgRef.current.setPointerCapture(event.pointerId)
    setDragging(true)
    onChange(pointAt(event))
  }

  const onPointerMove = (event) => {
    if (dragging) onChange(pointAt(event))
  }

  const endDrag = () => setDragging(false)

  const onKeyDown = (event) => {
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key]
    if (disabled || !move) return
    event.preventDefault()
    const step = event.shiftKey ? BIG_STEP : STEP
    const from = point ?? { x: 0, y: 0 }
    onChange(point ? { x: toCoordinate(from.x + move[0] * step), y: toCoordinate(from.y + move[1] * step) } : from)
  }

  return { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onKeyDown }
}
