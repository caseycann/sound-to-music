import { useState } from 'react'
import { UploadError, decodeUpload } from '../../audio/decodeUpload.js'
import { analyzeSamples } from '../../audio/features.js'
import { SilentClipError, processSelection } from '../../audio/process.js'
import { channelsOf, loudestWindow } from '../../audio/waveform.js'
import ClipPreview from './ClipPreview.jsx'
import FilePicker from './FilePicker.jsx'
import SelectionStep from './SelectionStep.jsx'
import StepHeading from '../StepHeading.jsx'

// Pick a file -> choose up to 3 s of it -> preview the cleaned-up clip.
// onClip receives { blob, samples, sampleRate, duration, analysis,
// originalName, selection } when a clip is ready (analysis is
// analyzeSamples' { features, audioX, audioY, terms }), and null when the
// student chooses again. children render under the clip preview (e.g. the
// describe form) and only while a clip is ready.
export default function Uploader({ onClip, children }) {
  const [upload, setUpload] = useState(null) // { name, audio }
  const [selection, setSelection] = useState(null) // { start, end } in seconds
  const [clip, setClip] = useState(null)
  const [busy, setBusy] = useState(null) // null | { opening: fileName } | 'processing'
  const [error, setError] = useState(null)

  async function handleFile(file) {
    setBusy({ opening: file.name })
    setError(null)
    try {
      const audio = await decodeUpload(file)
      setUpload({ name: file.name, audio })
      setSelection(loudestWindow(channelsOf(audio), audio.sampleRate))
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'Something went wrong opening that file. Try again.')
    } finally {
      setBusy(null)
    }
  }

  async function handleUse() {
    setBusy('processing')
    setError(null)
    try {
      const result = await processSelection(upload.audio, selection.start, selection.end)
      const analysis = analyzeSamples(result.samples, result.sampleRate)
      const next = { ...result, analysis, originalName: upload.name, selection }
      setClip(next)
      onClip?.(next)
    } catch (err) {
      console.error('Processing failed', err)
      setError(err instanceof SilentClipError ? err.message : 'Something went wrong cleaning up that part. Try again.')
    } finally {
      setBusy(null)
    }
  }

  function handleChooseAgain() {
    setClip(null)
    onClip?.(null)
  }

  function handlePickAnother() {
    setUpload(null)
    setSelection(null)
    setError(null)
  }

  // While no file is picked, FilePicker draws the Step 1 heading as its button.
  const picking = !busy?.opening && !clip && !upload
  let body
  if (busy?.opening) body = <p role="status">Opening {busy.opening}…</p>
  else if (clip) body = <ClipPreview clip={clip} onChooseAgain={handleChooseAgain} />
  else if (upload) {
    body = (
      <SelectionStep
        upload={upload}
        selection={selection}
        onSelectionChange={setSelection}
        onUse={handleUse}
        onPickAnother={handlePickAnother}
        processing={busy === 'processing'}
        error={error}
      />
    )
  } else body = <FilePicker onFile={handleFile} error={error} />

  return (
    <section className="uploader">
      {!picking && <StepHeading step={1}>Add a sound</StepHeading>}
      {body}
      {clip && children}
    </section>
  )
}
