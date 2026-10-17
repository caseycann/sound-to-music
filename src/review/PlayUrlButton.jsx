import { useClipPlayer } from '../audio/useClipPlayer.js'

export default function PlayUrlButton({ url, duration }) {
  const { play, playing, error } = useClipPlayer()

  return (
    <>
      <button type="button" onClick={() => play({ url, duration })} disabled={!url || playing}>
        {playing ? 'Playing…' : 'Play'}
      </button>
      {error && <span role="alert"> Couldn’t play</span>}
    </>
  )
}
