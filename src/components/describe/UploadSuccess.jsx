import { quadrantOf } from '../../../shared/quadrants.js'

// Shown after the student has saved their sound's spot.
export default function UploadSuccess({ words, position, onAnother }) {
  return (
    <section className="uploader" aria-live="polite">
      <h2>Sound added!</h2>
      <p>
        <strong>“{words.onomatopoeia}”</strong> ({words.descriptor1}, {words.descriptor2}) is in{' '}
        <strong>{quadrantOf(position.x, position.y)}</strong>.
      </p>
      <div className="button-row">
        <button type="button" onClick={onAnother} autoFocus>Upload another</button>
      </div>
    </section>
  )
}
