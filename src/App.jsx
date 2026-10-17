import SuperSonicProvider from './audio/SuperSonicProvider.jsx'
import SessionProvider from './session/SessionProvider.jsx'
import { useSession } from './session/SessionContext.js'
import AudioTestPage from './components/AudioTestPage.jsx'
import ClassBadge from './components/ClassBadge.jsx'
import JoinScreen from './components/JoinScreen.jsx'
import AddSound from './components/AddSound.jsx'
import JamSection from './components/jam/JamSection.jsx'
import ReviewPage from './review/ReviewPage.jsx'

export default function App() {
  // The teacher page needs no class code, so it sits outside the session.
  if (window.location.pathname.replace(/\/$/, '') === '/review') {
    return (
      <main>
        <ReviewPage />
      </main>
    )
  }
  return (
    <SessionProvider>
      <main>
        <h1>Discovered Sound Interface</h1>
        <Screen />
      </main>
    </SessionProvider>
  )
}

function Screen() {
  const { status } = useSession()
  if (status === 'checking') return <p role="status">Checking your class code…</p>
  if (status === 'needsJoin') return <JoinScreen />
  return (
    <SuperSonicProvider>
      <ClassBadge />
      <AddSound />
      <JamSection />
      <AudioTestPage />
    </SuperSonicProvider>
  )
}
