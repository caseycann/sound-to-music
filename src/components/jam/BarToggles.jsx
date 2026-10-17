import { useSuperSonic } from '../../audio/SuperSonicContext.js'

// One button per bar of the loop: on means the track plays in that bar. The
// bar that is sounding now is outlined. A change is heard from the next bar.
export default function BarToggles({ bars, onChange }) {
  const { currentBar } = useSuperSonic()

  return (
    <div className="bar-toggles" role="group" aria-label="Bars it plays in">
      {bars.map((on, i) => (
        <button
          key={i}
          className={i === currentBar ? 'bar-toggle is-now' : 'bar-toggle'}
          aria-pressed={on}
          aria-label={`Bar ${i + 1}`}
          onClick={() => onChange(bars.map((b, j) => (j === i ? !b : b)))}
        >
          {i + 1}
        </button>
      ))}
    </div>
  )
}
