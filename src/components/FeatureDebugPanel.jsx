import { quadrantOf } from '../../shared/quadrants.js'

// Raw audio features and where they put the sound. Shown only with ?debug.
export default function FeatureDebugPanel({ analysis }) {
  const { features, audioX, audioY, terms } = analysis
  return (
    <details className="debug-panel" open>
      <summary>Debug: audio placement</summary>
      <p>
        audioX <strong>{audioX.toFixed(3)}</strong>, audioY <strong>{audioY.toFixed(3)}</strong> ({quadrantOf(audioX, audioY)})
      </p>
      <TermTable label="X (Note +1 … Noise −1)" terms={terms.x} />
      <TermTable label="Y (Hold +1 … Hit −1)" terms={terms.y} />
      <p>
        Non-silent frames: {features.voicedFrames} of {features.totalFrames}
      </p>
    </details>
  )
}

function TermTable({ label, terms }) {
  return (
    <table>
      <caption>{label}</caption>
      <thead>
        <tr><th>Feature</th><th>Raw</th><th>Score</th><th>Weight</th><th>−1 at</th><th>+1 at</th></tr>
      </thead>
      <tbody>
        {terms.map((t) => (
          <tr key={t.feature}>
            <td>{t.feature}</td>
            <td>{t.value.toFixed(4)}</td>
            <td>{t.score.toFixed(3)}</td>
            <td>{t.weight}</td>
            <td>{t.minusAt}</td>
            <td>{t.plusAt}{t.log ? ' (log)' : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
