import { DEBUG } from '../../debug.js'
import DownloadLink from '../DownloadLink.jsx'
import FeatureDebugPanel from '../FeatureDebugPanel.jsx'
import PlayClipButton from './PlayClipButton.jsx'
import WaveformCanvas from './WaveformCanvas.jsx'

const baseName = (fileName) => fileName.replace(/\.[^.]+$/, '')

export default function ClipPreview({ clip, onChooseAgain }) {
  return (
    <section>
      <p>
        Your sound: {clip.duration.toFixed(2)} s from <strong>{clip.originalName}</strong>
      </p>
      <div className="waveform">
        <WaveformCanvas channels={[clip.samples]} sampleRate={clip.sampleRate} view={{ start: 0, end: clip.duration }} />
      </div>
      <div className="button-row">
        <PlayClipButton label="Play" getClip={() => clip} />
        <button type="button" onClick={onChooseAgain}>Choose again</button>
      </div>
      <DownloadLink blob={clip.blob} name={`${baseName(clip.originalName)}-clip`} label="Download clip" />
      {DEBUG && clip.analysis && <FeatureDebugPanel analysis={clip.analysis} />}
    </section>
  )
}
