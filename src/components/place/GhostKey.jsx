import { quadrantOf } from '../../field/quadrants.js'
import { formatPoint } from './formatPoint.js'

// Explains the two ghost dots, with Claude's one-line reason.
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
          'Claude couldn’t place your words this time.'
        )}
      </li>
      <li>
        <span className="ghost-swatch ghost-swatch-audio" aria-hidden="true" />
        <strong>Sound</strong>:{' '}
        {audio
          ? `Measuring the audio puts it in ${quadrantOf(audio.x, audio.y)} (${formatPoint(audio)}).`
          : 'The audio couldn’t be measured.'}
      </li>
    </ul>
  )
}
