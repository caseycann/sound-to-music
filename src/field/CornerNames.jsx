import { useEffect, useState } from 'react'

// Sound words for each quadrant, shown in turn in its corner of the field.
// Each list starts with the quadrant's own name, the one the track rows and
// dot labels use, and it is the only one shown under prefers-reduced-motion.
const CORNERS = [
  { quadrant: 'Whooshes', side: 'left', row: 'top', words: ['Whooshes', 'Whoosh', 'Hush', 'Hiss', 'Shhhh', 'Sigh', 'Crackle'] },
  { quadrant: 'Hums', side: 'right', row: 'top', words: ['Hums', 'Hum', 'Drone', 'Ring', 'Mmmm', 'Ooh', 'Whine'] },
  { quadrant: 'Clicks', side: 'left', row: 'bottom', words: ['Clicks', 'Click', 'Clack', 'Tap', 'Snap', 'Crunch', 'Thud'] },
  { quadrant: 'Plinks', side: 'right', row: 'bottom', words: ['Plinks', 'Plink', 'Ping', 'Plonk', 'Ding', 'Boing', 'Tink'] },
]

// One tick moves one corner on, in turn, so the four never change together:
// each corner changes every TICK_MS * 4 (3.2 s).
const TICK_MS = 800

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The quadrant names in the plot's corners. They don't move with the zoom
// and are hidden from screen readers (each dot's label names its quadrant).
// Each word fades in when it changes (.dot-field-corners in index.css): the
// key makes React draw a new <text>, which restarts the animation.
export default function CornerNames({ size, pad, filter }) {
  const tick = useTick(TICK_MS)
  return (
    <g className="dot-field-corners" aria-hidden="true" filter={filter}>
      {CORNERS.map((c, i) => {
        const word = c.words[Math.floor((tick + CORNERS.length - 1 - i) / CORNERS.length) % c.words.length]
        return (
          <text
            key={`${c.quadrant}-${word}`}
            className={`q-${c.quadrant.toLowerCase()}`}
            x={c.side === 'left' ? pad + 10 : size - pad - 10}
            y={c.row === 'top' ? pad + 20 : size - pad - 12}
            textAnchor={c.side === 'left' ? 'start' : 'end'}
          >
            {word}
          </text>
        )
      })}
    </g>
  )
}

// Counts up every `ms`, from 0. Stays at 0 under prefers-reduced-motion.
function useTick(ms) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (reducedMotion()) return
    const timer = setInterval(() => setTick((t) => t + 1), ms)
    return () => clearInterval(timer)
  }, [ms])
  return tick
}
