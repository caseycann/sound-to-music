import { useRef, useState } from 'react'
import { checkWords } from '../../../shared/words.js'
import { useSession } from '../../session/SessionContext.js'
import { saveSound } from '../../sound/saveSound.js'
import WordField from './WordField.jsx'

const EMPTY = { onomatopoeia: '', descriptor1: '', descriptor2: '' }

// The three words for a confirmed clip, then save. onSaved receives
// { id, url, audio, placement, words }. If saving fails the words stay, and
// Save sound tries again without uploading the clip twice. The form only
// mounts with a clip, and a new clip mounts a new form.
export default function DescribeForm({ clip, onSaved }) {
  const { classCode, expire } = useSession()
  const [values, setValues] = useState(EMPTY)
  const [problems, setProblems] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const progressRef = useRef({}) // saveSound's record of what's already done

  const setField = (field) => (value) => {
    setValues((v) => ({ ...v, [field]: value }))
    setProblems(({ [field]: _, ...rest }) => rest)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    const { words, problems: found } = checkWords(values)
    setProblems(found)
    if (Object.keys(found).length) {
      document.getElementById(`word-${Object.keys(found)[0]}`)?.focus()
      return
    }

    setValues(words) // show the student what will be saved
    setSaving(true)
    setError(null)
    try {
      const saved = await saveSound({ classCode, clip, words, progress: progressRef.current })
      onSaved({ ...saved, words })
    } catch (err) {
      setSaving(false)
      if (err.status === 401) {
        // The class was turned off. The dialog asks for a code; after that,
        // Save sound works again.
        setError('Saving stopped because your class code isn’t active. Join again, then press Save sound.')
        return expire()
      }
      console.error('Saving sound failed', err)
      setError(err.message || 'Something went wrong saving your sound. Try again.')
    }
  }

  const field = (name, label, hint) => (
    <WordField
      id={`word-${name}`}
      label={label}
      hint={hint}
      value={values[name]}
      onChange={setField(name)}
      error={problems[name]}
      disabled={saving}
    />
  )

  return (
    <form className="describe-form" onSubmit={handleSubmit} noValidate>
      <h3>Describe your sound</h3>
      {field('onomatopoeia', 'Onomatopoeia — words that make the sounds they describe', 'What it sounds like, e.g. “bzzt” or “plonk”')}
      {/* Two different questions, so the two words say different things. */}
      {field('descriptor1', 'How does it feel?', 'One word for its texture, e.g. “rough”, “smooth” or “fuzzy”')}
      {field('descriptor2', 'How does it move?', 'One word for how it starts or ends, e.g. “snappy”, “ringing” or “fading”')}
      <div className="button-row">
        <button type="submit" aria-disabled={saving || undefined}>{saving ? 'Saving…' : 'Save sound'}</button>
      </div>
      {error && <p role="alert" className="error-message">{error}</p>}
    </form>
  )
}
