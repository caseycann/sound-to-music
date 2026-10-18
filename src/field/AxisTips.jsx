// What each end of the field's axes means, in words for students: a title,
// then short lines, each on its own row (the music term and its meaning last).
const SUSTAIN = 'Sustain is how long a sound keeps going after it starts.'
const TONALITY = 'Tonality is whether a sound has a clear note (a pitch you could sing): tonal sounds do, atonal sounds don’t.'

export const AXIS_TIPS = {
  hold: {
    title: 'Hold',
    lines: ['The sound keeps going, like a hum or a long whoosh.', 'Higher dot = longer sound.', 'Also known as a long sustain.', SUSTAIN],
  },
  hit: {
    title: 'Hit',
    lines: ['The sound is over almost at once, like a click or a tap.', 'Lower dot = shorter sound.', 'Also known as a short sustain.', SUSTAIN],
  },
  noise: {
    title: 'Noise',
    lines: ['No note you could hum back, like wind, static or a crunch.', 'Further left = noisier.', 'Also known as atonal.', TONALITY],
  },
  note: {
    title: 'Note',
    lines: ['You could hum it back, like a bell or a whistle.', 'Further right = clearer note.', 'Also known as tonal.', TONALITY],
  },
}

// The box under the field that shows the active axis end's tip, and nothing
// otherwise. All four sit in the same spot and only the active one is
// visible, so the space is always kept and nothing below moves when a tip
// appears. Hidden ones stay in the page, so each AxisLabel's
// aria-describedby can point at its own. Hovering the box keeps it open.
export default function AxisTips({ idFor, tip }) {
  return (
    <div className="axis-tips" onMouseEnter={() => tip.active && tip.show(tip.active)} onMouseLeave={tip.hideSoon}>
      {Object.entries(AXIS_TIPS).map(([end, { title, lines }]) => (
        <div key={end} id={idFor(end)} role="tooltip" className={tip.active === end ? 'axis-tip is-open' : 'axis-tip'}>
          <strong>{title}</strong>
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ))}
    </div>
  )
}
