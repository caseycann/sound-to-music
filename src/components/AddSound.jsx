import { useState } from 'react'
import DescribeForm from './describe/DescribeForm.jsx'
import UploadSuccess from './describe/UploadSuccess.jsx'
import PlaceSound from './place/PlaceSound.jsx'
import Uploader from './uploader/Uploader.jsx'

// Pick and trim a clip -> describe it -> place it on the field -> done.
export default function AddSound() {
  const [round, setRound] = useState(0) // bumps to give Uploader a fresh start
  const [clip, setClip] = useState(null)
  const [saved, setSaved] = useState(null)
  const [position, setPosition] = useState(null)

  function handleAnother() {
    setPosition(null)
    setSaved(null)
    setClip(null)
    setRound((r) => r + 1)
  }

  if (saved && position) return <UploadSuccess words={saved.words} position={position} onAnother={handleAnother} />
  if (saved) return <PlaceSound saved={saved} onPlaced={setPosition} />

  return (
    <Uploader key={round} onClip={setClip}>
      {clip && <DescribeForm clip={clip} onSaved={setSaved} />}
    </Uploader>
  )
}
