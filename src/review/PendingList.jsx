import { useCallback, useEffect, useState } from 'react'
import ReviewRow from './ReviewRow.jsx'
import { fetchPending } from './reviewApi.js'

export default function PendingList({ token, onExpired }) {
  const [sounds, setSounds] = useState(null)
  const [error, setError] = useState('')

  const handleError = useCallback((err) => {
    if (err.status === 401) onExpired()
    else setError(err.message)
  }, [onExpired])

  const load = useCallback(async () => {
    setError('')
    try {
      setSounds(await fetchPending(token))
    } catch (err) {
      handleError(err)
    }
  }, [token, handleError])

  useEffect(() => { load() }, [load])

  const remove = (id) => setSounds((list) => list.filter((s) => s.id !== id))

  return (
    <>
      <p>
        {sounds ? `${sounds.length} pending` : 'Loading…'}{' '}
        <button type="button" onClick={load}>Refresh</button>
      </p>
      {error && <p role="alert">{error}</p>}
      {sounds?.length > 0 && (
        <div className="review-table-wrap">
          <table className="review-table">
            <thead>
              <tr>
                <th>Flag</th>
                <th>Sound</th>
                <th>Descriptors</th>
                <th>Class</th>
                <th>Claude’s reason</th>
                <th>Listen</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {sounds.map((sound) => (
                <ReviewRow key={sound.id} sound={sound} token={token} onDone={remove} onError={handleError} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
