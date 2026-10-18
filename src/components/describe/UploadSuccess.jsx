import { quadrantOf } from '../../../shared/quadrants.js'

// Shown after the student has saved their sound's spot. placement is
// /api/place's answer, or null if placing failed; either way a sound that
// needs review waits for the teacher before it shows up in the Jam.
export default function UploadSuccess({ words, position, placement, onAnother }) {
  const waiting = placement?.needsReview ?? true
  return (
    <section className="uploader" aria-live="polite">
      <h2>Sound added!</h2>
      <p>
        <strong>“{words.onomatopoeia}”</strong> ({words.descriptor1}, {words.descriptor2}) is in{' '}
        <strong>{quadrantOf(position.x, position.y)}</strong>.
      </p>
      <p>
        {waiting
          ? 'Your teacher will check it before it shows up in the jam.'
          : 'It’s in your class’s jam now.'}
      </p>
      <div className="button-row">
        <button type="button" onClick={onAnother} autoFocus>Upload another</button>
      </div>
    </section>
  )
}
