import { useId } from 'react'
import { useTip } from './useTip.js'

// tip: shown on hover over the label or keyboard focus. note: always shown,
// under the slider.
export default function RangeSlider({ label, min, max, step, value, onChange, format = String, disabled, tip, note }) {
  const id = useId()
  const noteId = `${id}-note`
  const { tipId, triggerProps, controlProps, tipProps } = useTip()
  const describedBy = [tip && tipId, note && noteId].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} {...(tip ? triggerProps : {})}>{label}</label>{' '}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)} // e.g. "Beat 2½", not "1.5"
        aria-describedby={describedBy}
        {...(tip ? controlProps : {})}
        onChange={(e) => onChange(Number(e.target.value))}
      />{' '}
      <output htmlFor={id}>{format(value)}</output>
      {note && <span id={noteId} className="slider-note">{note}</span>}
      {tip && <span {...tipProps}>{tip}</span>}
    </div>
  )
}
