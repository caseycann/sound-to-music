import { useId } from 'react'

export default function RangeSlider({ label, min, max, step, value, onChange, format = String, disabled }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id}>{label}</label>{' '}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />{' '}
      <output htmlFor={id}>{format(value)}</output>
    </div>
  )
}
