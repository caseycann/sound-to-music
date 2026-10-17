import { useState } from 'react'
import { useSession } from '../session/SessionContext.js'

export default function JoinScreen() {
  const { classCode, notice, join } = useSession()
  const [code, setCode] = useState(classCode)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await join(code)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Join your class</h2>
      {notice && !error && <p role="status">{notice}</p>}
      <label>
        Class code{' '}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          required
        />
      </label>{' '}
      <button type="submit" disabled={busy || !code.trim()}>
        {busy ? 'Checking…' : 'Join'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
