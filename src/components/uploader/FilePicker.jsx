import { useId, useRef, useState } from 'react'
import StepHeading from '../StepHeading.jsx'
import AddOptions from './AddOptions.jsx'

const ACCEPT = 'audio/*,.wav,.mp3,.flac,.m4a'

// The Step 1 box opens and closes the two ways to add a sound (AddOptions):
// Upload, which opens the file dialog of a hidden <input type="file">, and
// Record. They start open after an error or "Upload another" (autoFocus),
// when the student is already choosing; autoFocus also puts focus on the box.
// onFile(file) gets the uploaded or recorded file.
export default function FilePicker({ onFile, error, autoFocus }) {
  const inputRef = useRef(null)
  const optionsId = useId()
  const [open, setOpen] = useState(Boolean(error) || autoFocus)

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
          onClick: () => setOpen((o) => !o),
          expanded: open,
          controls: optionsId,
          hint: open ? 'Click to close' : 'Click to upload or record a sound',
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
      {open && <AddOptions id={optionsId} onUpload={() => inputRef.current.click()} onRecorded={onFile} />}
      {error && <p role="alert" className="error-message">{error}</p>}
    </div>
  )
}
