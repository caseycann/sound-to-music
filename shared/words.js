// Rules for the three words a student gives a sound (one onomatopoeia, two
// descriptors). Shared by the form in src/ and by /api/sounds, so the browser
// and the server agree on what is allowed.

export const MAX_WORD_LENGTH = 20

const ALLOWED = /^[\p{L} -]+$/u
const HAS_LETTER = /\p{L}/u

// Lowercase, trim, and collapse runs of spaces.
export function normalizeWord(raw) {
  return typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ').toLowerCase() : ''
}

// Returns a message for the student, or null if the normalized word is fine.
export function wordProblem(word) {
  if (!word) return 'Fill this in.'
  if (word.length > MAX_WORD_LENGTH) return `Keep it to ${MAX_WORD_LENGTH} characters or fewer.`
  if (!ALLOWED.test(word) || !HAS_LETTER.test(word)) return 'Use only letters, spaces and hyphens.'
  return null
}

export const WORD_FIELDS = ['onomatopoeia', 'descriptor1', 'descriptor2']

// Normalizes and checks all three. Returns { words, problems }, where problems
// maps a field name to its message and is empty when everything is valid.
export function checkWords(input) {
  const words = {}
  const problems = {}
  for (const field of WORD_FIELDS) {
    words[field] = normalizeWord(input?.[field])
    const problem = wordProblem(words[field])
    if (problem) problems[field] = problem
  }
  return { words, problems }
}
