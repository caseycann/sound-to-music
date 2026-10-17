import { useRef } from 'react'
import { MAX_UPLOAD_BYTES } from '../../audio/decodeUpload.js'
import StepHeading from '../StepHeading.jsx'

const ACCEPT = 'audio/*,.wav,.mp3,.flac,.m4a'

// The Step 1 box is the file chooser: clicking it opens the file dialog of a
// hidden <input type="file">.
export default function FilePicker({ onFile, error }) {
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
        action={{
          onClick: () => inputRef.current.click(),
          hint: `Click to choose a recording (up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)`,
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
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
