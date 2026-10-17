import { useState } from 'react'
import { logIn } from './reviewApi.js'

export default function PinForm({ notice, onToken }) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onToken(await logIn(pin))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      {notice && <p role="status">{notice}</p>}
      <label htmlFor="teacher-pin">Teacher PIN</label>{' '}
      <input
        id="teacher-pin"
        type="password"
        autoComplete="current-password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        required
      />{' '}
      <button type="submit" disabled={busy || !pin}>{busy ? 'Checking…' : 'Enter'}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
