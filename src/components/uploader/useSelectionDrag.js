import { useState } from 'react'
import { moveSelection, resizeSelection } from '../../audio/waveform.js'

const STEP_S = 0.05
const BIG_STEP_S = 0.5 // with Shift

// Pointer and keyboard editing of a selection drawn over `view`. Modes:
// 'move' (drag the window), 'start' / 'end' (drag an edge), 'seek' (press on
// the waveform: centre the window there, then drag it). While dragging, the
// view stays where it was, so a close-up doesn't scroll under the pointer.
export function useSelectionDrag({ trackRef, view, selection, duration, onChange }) {
  const [drag, setDrag] = useState(null)
  const shownView = drag?.view ?? view

  const timeAt = (clientX, { start, end }) => {
    const rect = trackRef.current.getBoundingClientRect()
    return start + ((clientX - rect.left) / rect.width) * (end - start)
  }

  const apply = (mode, origin, delta) =>
    mode === 'move'
      ? moveSelection(origin, delta, duration)
      : resizeSelection(origin, mode, origin[mode] + delta, duration)

  const beginDrag = (mode) => (event) => {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    const pointerTime = timeAt(event.clientX, shownView)
    let origin = selection
    if (mode === 'seek') {
      origin = moveSelection(selection, pointerTime - (selection.start + selection.end) / 2, duration)
      onChange(origin)
      mode = 'move'
    }
    trackRef.current.setPointerCapture(event.pointerId)
    setDrag({ mode, origin, pointerTime, view: shownView })
  }

  const onPointerMove = (event) => {
    if (!drag) return
    onChange(apply(drag.mode, drag.origin, timeAt(event.clientX, drag.view) - drag.pointerTime))
  }

  const endDrag = () => setDrag(null)

  const keyDown = (mode) => (event) => {
    const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
    if (!direction) return
    event.preventDefault()
    event.stopPropagation() // an edge handle sits inside the window
    onChange(apply(mode, selection, direction * (event.shiftKey ? BIG_STEP_S : STEP_S)))
  }

  return {
    shownView,
    beginDrag,
    keyDown,
    trackHandlers: { onPointerDown: beginDrag('seek'), onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag },
  }
}
