import StartAudioButton from './StartAudioButton.jsx'
import PlayTestSoundButton from './PlayTestSoundButton.jsx'
import TransportControls from './TransportControls.jsx'
import TrackControls from './TrackControls.jsx'
import RecordControls from './RecordControls.jsx'
import { TEST_BUFFER, useTestTrack } from './useTestTrack.js'

export default function AudioTestPage() {
  const { track, error } = useTestTrack()

  return (
    <section>
      <h2>Audio test</h2>
      <StartAudioButton />
      {error && <p role="alert">Could not load the test sound: {error.message}</p>}
      <PlayTestSoundButton bufferNumber={TEST_BUFFER} disabled={!track} />
      <TransportControls />
      {track && <TrackControls track={track} />}
      <RecordControls />
    </section>
  )
}
