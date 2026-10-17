import SuperSonicProvider from './audio/SuperSonicProvider.jsx'
import AudioTestPage from './components/AudioTestPage.jsx'

export default function App() {
  return (
    <SuperSonicProvider>
      <main>
        <h1>Discovered Sound Interface</h1>
        <AudioTestPage />
      </main>
    </SuperSonicProvider>
  )
}
