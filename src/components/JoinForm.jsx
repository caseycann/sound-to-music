import { useId, useState } from 'react'
import { useSession } from '../session/SessionContext.js'

// The class code field and Join button, for the Join screen and the
// re-join dialog. While checking, the button stays focusable (aria-disabled,
// not disabled), so keyboard focus isn't lost if the code is refused.
export default function JoinForm() {
  const { classCode, join } = useSession()
  const [code, setCode] = useState(classCode)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const errorId = useId()

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy || !code.trim()) return
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
    <form onSubmit={handleSubmit} noValidate>
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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </label>{' '}
      <button type="submit" aria-disabled={busy || !code.trim() || undefined}>
        {busy ? 'Checking…' : 'Join'}
      </button>
      {error && <p id={errorId} role="alert">{error}</p>}
    </form>
  )
}
