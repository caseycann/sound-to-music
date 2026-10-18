import { quadrantOf } from '../../../shared/quadrants.js'
import { formatPoint } from './formatPoint.js'

// Explains the two ghost dots, with Claude's one-line reason. Each dot also
// has its name ("Words", "Sound") written beside it on the field, so the
// swatch colours are never the only way to tell them apart.
export default function GhostKey({ claude, audio, reason }) {
  return (
    <ul className="ghost-key">
      <li>
        <span className="ghost-swatch ghost-swatch-claude" aria-hidden="true" />
        <strong>Words</strong>:{' '}
        {claude ? (
          <>
            Claude read your words as {quadrantOf(claude.x, claude.y)} ({formatPoint(claude)}). {reason}
          </>
        ) : (
          'Claude couldn’t place your words this time, so there’s no Words dot. Your sound is still saved.'
        )}
      </li>
      <li>
        <span className="ghost-swatch ghost-swatch-audio" aria-hidden="true" />
        <strong>Sound</strong>:{' '}
        {audio
          ? `Measuring the audio puts it in ${quadrantOf(audio.x, audio.y)} (${formatPoint(audio)}).`
          : 'The audio couldn’t be measured, so there’s no Sound dot.'}
      </li>
    </ul>
  )
}
