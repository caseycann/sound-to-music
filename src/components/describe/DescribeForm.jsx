import { useState } from 'react'
import { checkWords } from '../../../shared/words.js'
import { useSession } from '../../session/SessionContext.js'
import { SaveError, saveSound } from '../../sound/saveSound.js'
import WordField from './WordField.jsx'

const EMPTY = { onomatopoeia: '', descriptor1: '', descriptor2: '' }

// The three words for a confirmed clip, then save. onSaved receives
// { id, url, words }.
export default function DescribeForm({ clip, onSaved }) {
  const { classCode, leave } = useSession()
  const [values, setValues] = useState(EMPTY)
  const [problems, setProblems] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const setField = (field) => (value) => {
    setValues((v) => ({ ...v, [field]: value }))
    setProblems(({ [field]: _, ...rest }) => rest)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const { words, problems: found } = checkWords(values)
    setProblems(found)
    if (Object.keys(found).length) return

    setValues(words) // show the student what will be saved
    setSaving(true)
    setError(null)
    try {
      const saved = await saveSound({ classCode, clip, words })
      onSaved({ ...saved, words })
    } catch (err) {
      if (err.status === 401) return leave()
      console.error('Saving sound failed', err)
      setError(err instanceof SaveError ? err.message : 'Something went wrong saving your sound. Try again.')
      setSaving(false)
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
      {field('onomatopoeia', 'Sound word', 'What it sounds like, e.g. “bzzt” or “plonk”')}
      {field('descriptor1', 'Describe it', 'One word, e.g. “buzzy”')}
      {field('descriptor2', 'Describe it again', 'Another word, e.g. “bright”')}
      <div className="button-row">
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save sound'}</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
