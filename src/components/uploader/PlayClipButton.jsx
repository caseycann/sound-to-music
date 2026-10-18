import { useClipPlayer } from '../../audio/useClipPlayer.js'

// getClip() -> { blob, duration }, called on each click. While playing, the
// button stays focusable (aria-disabled) so keyboard focus isn't lost.
export default function PlayClipButton({ label, getClip, disabled }) {
  const { play, playing, error } = useClipPlayer()
  const off = disabled || playing

  return (
    <>
      <button type="button" onClick={() => !off && play(getClip())} aria-disabled={off || undefined}>
        {playing ? 'Playing…' : label}
      </button>
      {error && <p role="alert" className="error-message">{error}</p>}
    </>
  )
}
