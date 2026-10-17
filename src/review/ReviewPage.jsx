import { useCallback, useState } from 'react'
import SuperSonicProvider from '../audio/SuperSonicProvider.jsx'
import PinForm from './PinForm.jsx'
import PendingList from './PendingList.jsx'
import { clearToken, loadToken, saveToken } from './reviewApi.js'

// /review: teachers approve or reject pending sounds from every class.
export default function ReviewPage() {
  const [token, setToken] = useState(loadToken)
  const [notice, setNotice] = useState('')

  const signIn = (newToken) => {
    saveToken(newToken)
    setNotice('')
    setToken(newToken)
  }

  const signOut = useCallback((message = '') => {
    clearToken()
    setNotice(message)
    setToken(null)
  }, [])
  const expire = useCallback(() => signOut('Your session ended. Enter the PIN again.'), [signOut])

  return (
    <div className="review">
      <h2>Review sounds</h2>
      {token ? (
        <SuperSonicProvider>
          <button type="button" onClick={() => signOut()}>Sign out</button>
          <PendingList token={token} onExpired={expire} />
        </SuperSonicProvider>
      ) : (
        <PinForm notice={notice} onToken={signIn} />
      )}
    </div>
  )
}
