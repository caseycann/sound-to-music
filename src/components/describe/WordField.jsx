import { MAX_WORD_LENGTH } from '../../../shared/words.js'

// One labelled word input with its hint and error message.
export default function WordField({ id, label, hint, value, onChange, error, disabled }) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  return (
    <div className="word-field">
      <label htmlFor={id}>{label}</label>
      <span id={hintId} className="word-hint">{hint}</span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_WORD_LENGTH + 10}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
      />
      {error && <span id={errorId} className="word-error">{error}</span>}
    </div>
  )
}
