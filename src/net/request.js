// One way to call our /api functions (and Cloudinary) from the browser, so
// every failure becomes a RequestError with a message a student can act on.
//
// status: the HTTP status, or 0 when there was no answer (offline, server
// unreachable, or too slow). code: our API's { error } code, 'timeout',
// 'offline', or 'network'. Status 401 from /api means the class code stopped
// working; callers hand that to the session (expire()).

export class RequestError extends Error {
  constructor(status, message, code = '') {
    super(message)
    this.status = status
    this.code = code
  }
}

export const DEFAULT_TIMEOUT_MS = 30_000

export const MESSAGES = {
  offline: 'You’re offline. Check your Wi-Fi, then try again.',
  network: 'Could not reach the server. Check your connection and try again.',
  timeout: 'The server took too long to answer. Try again.',
  401: 'Your class code isn’t active any more.',
  429: 'Too many tries at once. Wait a minute, then try again.',
  server: 'The server is having trouble right now. Wait a moment, then try again.',
  other: 'Something went wrong. Try again.',
}

// The student-facing message for a failed answer. `messages` can override by
// API error code or by status: { invalid_words: '…', 404: '…' }.
export function messageFor(status, code, messages = {}) {
  if (code && messages[code]) return messages[code]
  if (messages[status]) return messages[status]
  if (MESSAGES[status]) return MESSAGES[status]
  return status >= 500 ? MESSAGES.server : MESSAGES.other
}

// Resolves with the parsed JSON body. Throws RequestError.
// options: fetch's init, plus timeoutMs and messages (see messageFor).
export async function requestJson(url, { timeoutMs = DEFAULT_TIMEOUT_MS, messages = {}, ...init } = {}) {
  let res
  try {
    res = await fetch(url, { ...init, signal: timeoutSignal(timeoutMs) })
  } catch (err) {
    throw noAnswer(err, messages)
  }
  if (!res.ok) {
    const code = await errorCode(res)
    console.error(`${url} failed`, res.status, code)
    throw new RequestError(res.status, messageFor(res.status, code, messages), code)
  }
  try {
    return await res.json()
  } catch {
    throw new RequestError(res.status, MESSAGES.other, 'bad_json')
  }
}

// POST a JSON body.
export function postJson(url, body, options = {}) {
  return requestJson(url, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
  })
}

function noAnswer(err, messages) {
  const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError'
  const code = timedOut ? 'timeout' : navigator.onLine === false ? 'offline' : 'network'
  return new RequestError(0, messages[code] ?? MESSAGES[code], code)
}

async function errorCode(res) {
  try {
    const body = await res.json()
    return typeof body?.error === 'string' ? body.error : ''
  } catch {
    return ''
  }
}

// AbortSignal.timeout is missing from a few older browsers; they just wait.
function timeoutSignal(ms) {
  return typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined
}
