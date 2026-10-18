import { useRef } from 'react'
import { MAX_UPLOAD_BYTES } from '../../audio/decodeUpload.js'
import StepHeading from '../StepHeading.jsx'

const ACCEPT = 'audio/*,.wav,.mp3,.flac,.m4a'

// The Step 1 box is the file chooser: clicking it opens the file dialog of a
// hidden <input type="file">. autoFocus puts focus on the box when it comes
// back (after an error, or "Pick a different file"), so the student can
// press Enter to choose again.
export default function FilePicker({ onFile, error, autoFocus }) {
  const inputRef = useRef(null)

  function handleChange(event) {
    const file = event.target.files[0]
    event.target.value = '' // so picking the same file again still fires
    if (file) onFile(file)
  }

  return (
    <div>
      <StepHeading
        step={1}
        autoFocus={autoFocus}
        action={{
          onClick: () => inputRef.current.click(),
          hint: error
            ? 'Click to choose a different recording'
            : `Click to choose a recording (WAV, MP3, FLAC or M4A, up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)`,
        }}
      >
        Add a sound
      </StepHeading>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={ACCEPT}
        onChange={handleChange}
        tabIndex={-1}
        aria-hidden="true"
      />
      {error && <p role="alert" className="error-message">{error}</p>}
    </div>
  )
}
