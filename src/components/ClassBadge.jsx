import { useSession } from '../session/SessionContext.js'

// The joined class, in the top right corner, with the way to the teacher's
// review page under it (see .class-corner in index.css). Review opens in a new
// tab so a click doesn't throw away the clip or the jam on this one.
export default function ClassBadge() {
  const { classCode, className, leave } = useSession()

  return (
    <div className="class-corner">
      <div className="class-badge">
        <span className="class-badge-label">Class</span>
        <span className="class-badge-name">{className || classCode}</span>
        <button type="button" onClick={() => leave()}>Switch class</button>
      </div>
      <a className="review-link" href="/review" target="_blank" rel="noopener noreferrer">
        Teacher review<span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    </div>
  )
}
