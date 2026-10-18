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

  // The student chose to switch class: back to the Join screen.
  const leave = useCallback(() => {
    clearStoredCode()
    setSession(NEEDS_JOIN)
  }, [])

  // An /api call answered 401 mid-session (the teacher turned the class
  // off). The page stays as it is under a dialog asking for a code, so the
  // student's clip and jam survive; joining again carries on from there.
  // Only a joined session can expire; calling it again changes nothing.
  const expire = useCallback(() => {
    clearStoredCode()
    setSession((prev) => (prev.status !== 'joined' ? prev : {
      ...prev,
      status: 'expired',
      notice: `The class code ${prev.classCode} isn’t active any more. Ask your teacher for a code, then join again. Your sound and your jam are still here.`,
    }))
  }, [])

  const value = useMemo(() => ({ ...session, join, leave, expire }), [session, join, leave, expire])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
