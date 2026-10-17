import { createContext, useContext } from 'react'

export const SessionContext = createContext(null)

// status:    'checking' (validating a stored code) | 'needsJoin' | 'joined'
// classCode, className: set when joined
// notice:    why the Join screen is showing again, or null
// join(code) -> Promise; rejects with a JoinError the caller can show
// leave():   forget the code (call this if an /api call answers 401)
export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}
