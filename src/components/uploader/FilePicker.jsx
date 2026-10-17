import { MAX_UPLOAD_BYTES } from '../../audio/decodeUpload.js'

const ACCEPT = 'audio/*,.wav,.mp3,.flac,.m4a'

export default function FilePicker({ onFile, error }) {
  function handleChange(event) {
    const file = event.target.files[0]
    event.target.value = '' // so picking the same file again still fires
    if (file) onFile(file)
  }

  return (
    <div>
      <label>
        Choose a recording (WAV, MP3, FLAC or M4A, up to {MAX_UPLOAD_BYTES / 1024 / 1024} MB){' '}
        <input type="file" accept={ACCEPT} onChange={handleChange} />
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
