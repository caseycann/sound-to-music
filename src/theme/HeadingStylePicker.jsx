import { useState } from 'react'
import { HEADING_STYLES, currentHeadingStyle, setHeadingStyle } from './headingStyle.js'

// Debug-only (?debug): try each heading style on the real page.
export default function HeadingStylePicker() {
  const [style, setStyle] = useState(currentHeadingStyle)

  function handleChange(event) {
    setHeadingStyle(event.target.value)
    setStyle(event.target.value)
  }

  return (
    <label className="heading-style-picker">
      Heading style{' '}
      <select value={style} onChange={handleChange}>
        {HEADING_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  )
}
