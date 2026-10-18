import { createContext, useContext } from 'react'

export const SessionContext = createContext(null)

// status:    'checking' (validating a stored code) | 'needsJoin' | 'joined'
//            | 'expired' (the code stopped working mid-session; the page
//            stays, under a dialog to join again)
// classCode, className: set when joined (and kept while expired)
// notice:    why the Join screen or dialog is showing, or null
// join(code) -> Promise; rejects with a RequestError the caller can show
// leave():   the student switches class (back to the Join screen)
// expire():  call this when an /api call answers 401
export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}
