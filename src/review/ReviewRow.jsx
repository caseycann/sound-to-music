import { useState } from 'react'
import PlayUrlButton from './PlayUrlButton.jsx'
import { decide } from './reviewApi.js'

export default function ReviewRow({ sound, token, onDone, onError }) {
  const [busy, setBusy] = useState(false)

  const choose = async (status) => {
    setBusy(true)
    try {
      await decide(token, sound.id, status)
      onDone(sound.id)
    } catch (err) {
      onError(err)
      setBusy(false)
    }
  }

  return (
    <tr className={sound.needsReview ? 'review-flagged' : undefined}>
      <td>{sound.needsReview ? 'Needs review' : ''}</td>
      <td><strong>{sound.onomatopoeia}</strong></td>
      <td>{sound.descriptor1}, {sound.descriptor2}</td>
      <td>{sound.className}</td>
      <td>{sound.reason}</td>
      <td><PlayUrlButton url={sound.audioUrl} duration={sound.duration} /></td>
      <td className="review-actions">
        <button type="button" disabled={busy} onClick={() => choose('Approved')}>Approve</button>
        <button type="button" disabled={busy} onClick={() => choose('Rejected')}>Reject</button>
      </td>
    </tr>
  )
}
