import { useSession } from '../session/SessionContext.js'

// The joined class, in the top right corner (see .class-badge in index.css).
export default function ClassBadge() {
  const { classCode, className, leave } = useSession()

  return (
    <div className="class-badge">
      <span className="class-badge-label">Class</span>
      <span className="class-badge-name">{className || classCode}</span>
      <button type="button" onClick={leave}>Switch class</button>
    </div>
  )
}
