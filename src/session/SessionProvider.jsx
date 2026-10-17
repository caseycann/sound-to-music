import { useCallback, useEffect, useMemo, useState } from 'react'
import { SessionContext } from './SessionContext.js'
import { joinClass } from './joinClass.js'
import { clearStoredCode, readStoredCode, storeCode } from './storedCode.js'

const NEEDS_JOIN = { status: 'needsJoin', classCode: '', className: '', notice: null }

export default function SessionProvider({ children }) {
  const [session, setSession] = useState(() =>
    readStoredCode() ? { ...NEEDS_JOIN, status: 'checking' } : NEEDS_JOIN,
  )

  // Re-check a stored code on every visit. Only a 401 forgets it; a network
  // or server error keeps it and prefills the Join screen.
  useEffect(() => {
    const stored = readStoredCode()
    if (!stored) return
    let cancelled = false
    joinClass(stored).then(
      (className) => {
        if (!cancelled) setSession({ status: 'joined', classCode: stored, className, notice: null })
      },
      (err) => {
        if (cancelled) return
        if (err.status === 401) {
          clearStoredCode()
          setSession({ ...NEEDS_JOIN, notice: 'Your class code stopped working. Enter a new one.' })
        } else {
          setSession({ ...NEEDS_JOIN, classCode: stored, notice: err.message })
        }
      },
    )
    return () => { cancelled = true }
  }, [])

  const join = useCallback(async (rawCode) => {
    const classCode = rawCode.trim().toUpperCase()
    const className = await joinClass(classCode)
    storeCode(classCode)
    setSession({ status: 'joined', classCode, className, notice: null })
  }, [])

  const leave = useCallback(() => {
    clearStoredCode()
    setSession(NEEDS_JOIN)
  }, [])

  const value = useMemo(() => ({ ...session, join, leave }), [session, join, leave])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
