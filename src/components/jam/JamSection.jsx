import { useSuperSonic } from '../../audio/SuperSonicContext.js'
import StartAudioButton from '../StartAudioButton.jsx'
import JamLibrary from './JamLibrary.jsx'

export default function JamSection() {
  const { status } = useSuperSonic()
  return (
    <section className="jam">
      <h2>Jam</h2>
      <StartAudioButton />
      {status === 'ready' && <JamLibrary />}
    </section>
  )
}
