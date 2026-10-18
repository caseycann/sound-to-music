import { useId } from 'react'
import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import { LOOP_BARS } from '../../audio/limits.js'
import { useTip } from '../useTip.js'

// One button per bar of the loop: on means the track plays in that bar. The
// bar that is sounding now is outlined. A change is heard from the next bar.
export default function BarToggles({ bars, onChange }) {
  const { currentBar } = useSuperSonic()
  const labelId = useId()
  const { tipId, triggerProps, controlProps, tipProps } = useTip()

  return (
    <div className="bar-toggles" role="group" aria-labelledby={labelId} aria-describedby={tipId} {...controlProps}>
      <span id={labelId} {...triggerProps} className="tip-trigger bar-toggles-label">Bars</span>
      {bars.map((on, i) => (
        <button
          type="button"
          key={i}
          className={i === currentBar ? 'bar-toggle is-now' : 'bar-toggle'}
          aria-pressed={on}
          aria-label={`Bar ${i + 1}`}
          onClick={() => onChange(bars.map((b, j) => (j === i ? !b : b)))}
        >
          {i + 1}
        </button>
      ))}
      <span {...tipProps}>
        The loop is {LOOP_BARS} bars long. Lit bars play this sound; turn one off to leave a rest there. The bar
        playing now has a white ring.
      </span>
    </div>
  )
}
