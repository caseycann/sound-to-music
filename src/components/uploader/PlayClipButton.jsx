import { useClipPlayer } from '../../audio/useClipPlayer.js'

// getClip() -> { blob, duration }, called on each click.
export default function PlayClipButton({ label, getClip, disabled }) {
  const { play, playing, error } = useClipPlayer()

  return (
    <>
      <button type="button" onClick={() => play(getClip())} disabled={disabled || playing}>
        {playing ? 'Playing…' : label}
      </button>
      {error && <p role="alert">Couldn’t play the sound: {error.message}</p>}
    </>
  )
}
