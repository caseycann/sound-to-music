import { useId, useImperativeHandle, useRef } from 'react'
import AxisLabel from './AxisLabel.jsx'
import AxisTips from './AxisTips.jsx'
import { useAxisTip } from './useAxisTip.js'
import DotFieldFrame from './DotFieldFrame.jsx'
import DotTooltip from './DotTooltip.jsx'
import ZoomControls from './ZoomControls.jsx'
import { useDotField } from './useDotField.js'
import { useElementWidth } from './useElementWidth.js'

const NO_IDS = new Set()
const NO_STATES = {}

// A square field of sounds you can zoom, pan and pick from.
//   sounds:  [{ id, onomatopoeia, descriptors, finalX, finalY, quadrant? }]
//   usedIds: Set of ids that are faded out and can't be picked
//   states:  { [id]: 'loading' | 'error' } for per-dot status styling
//   onPick(sound): click, or Enter / Space on a focused dot
//   highlight: outline the field, e.g. while a pick will add a track
//   describedBy: id of the text with the keyboard instructions
//   ref: { focus() } puts keyboard focus on the field's tab stop
export default function DotField({ ref, sounds, usedIds = NO_IDS, states = NO_STATES, onPick, highlight = false, label = 'Sounds', describedBy }) {
  const [frameRef, size] = useElementWidth()
  const svgRef = useRef(null)
  const field = useDotField({ svgRef, size, sounds, usedIds, states, onPick, highlight })
  useImperativeHandle(ref, () => ({ focus: field.focusField }), [field.focusField])
  const axisTip = useAxisTip()
  const tipBase = useId()
  const tipIdFor = (end) => `${tipBase}-axis-${end}`

  return (
    <div className={highlight ? 'dot-field is-highlighted' : 'dot-field'}>
      {/* The axis ends sit around the field, Noise and Note level with its middle. */}
      <div className="dot-field-axes">
        <AxisLabel end="hold" tipId={tipIdFor('hold')} tip={axisTip}>↑ Hold</AxisLabel>
        <AxisLabel end="noise" tipId={tipIdFor('noise')} tip={axisTip}>← Noise</AxisLabel>
        <div ref={frameRef} className="dot-field-frame">
          <DotFieldFrame ref={svgRef} size={size} label={label} describedBy={describedBy} />
          {field.active && <DotTooltip {...field.active} state={states[field.active.sound.id]} fieldSize={size} />}
        </div>
        <AxisLabel end="note" tipId={tipIdFor('note')} tip={axisTip}>Note →</AxisLabel>
        <AxisLabel end="hit" tipId={tipIdFor('hit')} tip={axisTip}>↓ Hit</AxisLabel>
      </div>
      <ZoomControls
        zoomed={field.zoomed}
        canZoomIn={field.canZoomIn}
        onZoomIn={field.zoomIn}
        onZoomOut={field.zoomOut}
        onReset={field.resetZoom}
      />
      <AxisTips idFor={tipIdFor} tip={axisTip} />
    </div>
  )
}
