import { useSession } from '../session/SessionContext.js'
import JoinForm from './JoinForm.jsx'

export default function JoinScreen() {
  const { notice } = useSession()

  return (
    <section className="join">
      <h2>Join your class</h2>
      {notice && <p role="status">{notice}</p>}
      <JoinForm />
    </section>
  )
}
