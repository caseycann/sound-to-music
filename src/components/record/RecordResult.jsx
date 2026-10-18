import { useObjectUrl } from '../useObjectUrl.js'
import DownloadLink from '../DownloadLink.jsx'

// A finished recording: listen back, then save it as a file.
export default function RecordResult({ name, original, wav }) {
  const url = useObjectUrl(wav ?? original)

  return (
    <div className="record-result">
      <h3>Your recording</h3>
      {url && <audio controls src={url} />}
      <p>
        {wav ? (
          <DownloadLink blob={wav} name={name} label="Save WAV" />
        ) : (
          <DownloadLink blob={original} name={name} label="Save recording" />
        )}
      </p>
    </div>
  )
}
