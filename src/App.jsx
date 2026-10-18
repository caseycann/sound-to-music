import SuperSonicProvider from './audio/SuperSonicProvider.jsx'
import SessionProvider from './session/SessionProvider.jsx'
import { useSession } from './session/SessionContext.js'
import AudioTestPage from './components/AudioTestPage.jsx'
import ClassBadge from './components/ClassBadge.jsx'
import JoinScreen from './components/JoinScreen.jsx'
import RejoinDialog from './components/RejoinDialog.jsx'
import UnsupportedBrowser from './components/UnsupportedBrowser.jsx'
import AddSound from './components/AddSound.jsx'
import JamSection from './components/jam/JamSection.jsx'
import ReviewPage from './review/ReviewPage.jsx'
import { DEBUG } from './debug.js'
import { missingFeatures } from './support.js'
import HeadingStylePicker from './theme/HeadingStylePicker.jsx'

const MISSING = missingFeatures()

export default function App() {
  // The teacher page needs no class code, so it sits outside the session.
  if (window.location.pathname.replace(/\/$/, '') === '/review') {
    return (
      <main>
        <ReviewPage />
        {DEBUG && <HeadingStylePicker />}
      </main>
    )
  }
  return (
    <main>
      {/* Not shown, but screen readers still get the page's name. */}
      <h1 className="visually-hidden">Found Sound Interface</h1>
      {MISSING.length ? (
        <UnsupportedBrowser missing={MISSING} />
      ) : (
        <SessionProvider>
          <Screen />
        </SessionProvider>
      )}
      {DEBUG && <HeadingStylePicker />}
    </main>
  )
}

function Screen() {
  const { status } = useSession()
  if (status === 'checking') return <p role="status">Checking your class code…</p>
  if (status === 'needsJoin') return <JoinScreen />
  // 'joined' or 'expired': the page stays mounted either way, so nothing is
  // lost while the student joins again.
  return (
    <>
      <SuperSonicProvider>
        <ClassBadge />
        <AddSound />
        <JamSection />
        {/* Its test track joins the jam's tracks, so keep it out of students' way. */}
        {DEBUG && <AudioTestPage />}
      </SuperSonicProvider>
      {status === 'expired' && <RejoinDialog />}
    </>
  )
}
