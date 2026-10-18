import { MAX_UPLOAD_BYTES } from '../../audio/decodeUpload.js'
import { COUNTDOWN_S, MAX_MIC_S, micSupported, useMicRecorder } from '../../audio/useMicRecorder.js'
import { useFocusOnMount } from '../useFocusOnMount.js'

// The two ways to add a sound, shown when the Step 1 box is opened: upload a
// file (onUpload opens the file dialog) or record with the microphone. A
// microphone recording goes to onRecorded(file), the same path as an upload,
// so the student then chooses up to 3 s of it as usual. Browsers without a
// microphone recorder get the Upload button alone.
// TODO(rule 5): hide Record for students who opted out of recording, once
// there are student records.
export default function AddOptions({ id, onUpload, onRecorded }) {
  const mic = useMicRecorder(onRecorded)
  const canRecord = micSupported()
  const capturing = mic.status === 'countdown' || mic.status === 'recording'

  let hint = `Upload a recording (WAV, MP3, FLAC or M4A, up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)`
  if (canRecord) hint += `, or record up to ${MAX_MIC_S} seconds with the microphone after a ${COUNTDOWN_S}-second countdown`
  if (mic.status === 'asking') hint = 'If the browser asks to use the microphone, choose Allow.'

  return (
    <div id={id} className="add-options">
      {capturing ? (
        <Capture mic={mic} />
      ) : (
        <>
          <div className="add-options-buttons">
            <button type="button" className="add-option" onClick={onUpload}>
              ⇪ Upload a sound
            </button>
            {canRecord && (
              <button
                type="button"
                className="add-option"
                onClick={mic.status === 'idle' ? mic.start : undefined}
                aria-disabled={mic.status !== 'idle' || undefined}
              >
                {mic.status === 'asking' ? 'Waiting for the microphone…' : '● Record a sound'}
              </button>
            )}
          </div>
          <p className="add-options-hint">{hint}. Nothing leaves this computer until you save your sound.</p>
        </>
      )}
      {mic.error && <p role="alert" className="error-message">{mic.error}</p>}
    </div>
  )
}

// The countdown, then the recording: a level meter (so the student can see
// the mic hears them before it counts), and Cancel / Stop. That button takes
// focus, since it replaces the one the student just pressed; it is the same
// element in both phases, so focus stays on it.
function Capture({ mic }) {
  const buttonRef = useFocusOnMount(true)
  const counting = mic.status === 'countdown'

  return (
    <div className="mic-capture">
      {counting ? (
        <p role="status" className="mic-status">
          Get ready… <span className="mic-count">{mic.count}</span>
        </p>
      ) : (
        <p role="status" className="mic-status">Recording… make your sound now.</p>
      )}
      <div className="mic-meter" aria-hidden="true">
        <div className="mic-meter-fill" style={{ width: `${Math.round(mic.level * 100)}%` }} />
      </div>
      <p className="mic-time">{counting ? `Recording starts in ${mic.count}` : `${mic.seconds.toFixed(1)} s of ${MAX_MIC_S} s`}</p>
      <button ref={buttonRef} type="button" className={counting ? 'add-option' : 'add-option is-recording'} onClick={mic.stop}>
        {counting ? 'Cancel' : '■ Stop'}
      </button>
    </div>
  )
}
