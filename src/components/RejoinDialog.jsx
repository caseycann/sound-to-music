import { useEffect, useId, useRef } from 'react'
import { useSession } from '../session/SessionContext.js'
import JoinForm from './JoinForm.jsx'

// Shown over the page when the class code stops working mid-session. A
// modal <dialog> makes the page behind it inert and keeps keyboard focus
// inside, while the student's clip and jam stay as they were. It can't be
// dismissed with Escape: there is nothing to go back to without a code.
// Joining (with the same code once it's back on, or a new one) closes it
// and puts focus back where it was. showModal() focuses the code field.
export default function RejoinDialog() {
  const { notice } = useSession()
  const ref = useRef(null)
  const headingId = useId()

  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  return (
    <dialog ref={ref} className="rejoin-dialog" aria-labelledby={headingId} onCancel={(e) => e.preventDefault()}>
      <h2 id={headingId}>Join your class again</h2>
      <p>{notice}</p>
      <JoinForm />
    </dialog>
  )
}
