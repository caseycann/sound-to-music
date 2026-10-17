import { useSession } from '../session/SessionContext.js'

export default function ClassBadge() {
  const { classCode, className, leave } = useSession()

  return (
    <p>
      Class: {className || classCode}{' '}
      <button type="button" onClick={leave}>Switch class</button>
    </p>
  )
}
