// Teacher review: token storage and calls to /api/teacher-login and /api/review.
// The token lives in sessionStorage, so it ends with the tab, and the server
// also expires it after two hours.
const TOKEN_KEY = 'teacherToken'

export class ReviewError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// The stored token, or null if there is none or it has expired. Tokens look
// like "teacher.<expiresAt>.<signature>".
export function loadToken() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (token && Number(token.split('.')[1]) > Date.now()) return token
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage blocked: the teacher just enters the PIN again.
  }
  return null
}

export function saveToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Works for this page view anyway.
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing stored.
  }
}

const MESSAGES = {
  401: 'Wrong PIN.',
  429: 'Too many wrong tries. Wait 15 minutes and try again.',
}

export async function logIn(pin) {
  const { token } = await call('/api/teacher-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  }, MESSAGES)
  return token
}

export async function fetchPending(token) {
  const { sounds } = await call('/api/review', { headers: auth(token) })
  return sounds
}

export async function decide(token, soundId, status) {
  await call('/api/review', {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ soundId, status }),
  })
}

const auth = (token) => ({ Authorization: `Bearer ${token}` })

// Throws ReviewError. Status 401 from /api/review means the token has expired.
async function call(path, init, messages = {}) {
  let res
  try {
    res = await fetch(path, init)
  } catch {
    throw new ReviewError(0, 'Could not reach the server. Check your connection.')
  }
  if (!res.ok) throw new ReviewError(res.status, messages[res.status] ?? `Request failed (${res.status}).`)
  return res.json()
}
