import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { HttpError, sendError } from './auth.js'

// Teacher access for the review page. A correct TEACHER_PIN gets a token
// signed with TEACHER_TOKEN_SECRET; review endpoints accept it in
// "Authorization: Bearer <token>" instead of a class code (CLAUDE.md rule 2).

export const TOKEN_TTL_MS = 2 * 60 * 60 * 1000
const MAX_FAILURES = 5
const LOCKOUT_MS = 15 * 60 * 1000

// Client IP -> { count, until }. Per serverless instance, so this slows
// guessing down rather than stopping it outright: use a long PIN.
const failures = new Map()

export function teacherConfig(env = process.env) {
  const pin = env.TEACHER_PIN
  const secret = env.TEACHER_TOKEN_SECRET
  if (!pin || !secret) throw new Error('TEACHER_PIN and TEACHER_TOKEN_SECRET must be set')
  return { pin, secret }
}

// The PIN is part of the key, so changing it signs every teacher out.
function sign(payload, { pin, secret }) {
  return createHmac('sha256', `${secret}:${pin}`).update(payload).digest('base64url')
}

// Constant-time comparison of two strings of any length.
function sameString(a, b) {
  const digest = (s) => createHash('sha256').update(String(s)).digest()
  return timingSafeEqual(digest(a), digest(b))
}

export function issueToken(config, now = Date.now()) {
  const expiresAt = now + TOKEN_TTL_MS
  const payload = `teacher.${expiresAt}`
  return { token: `${payload}.${sign(payload, config)}`, expiresAt }
}

export function isValidToken(token, config, now = Date.now()) {
  if (typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'teacher') return false
  const expiresAt = Number(parts[1])
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false
  return sameString(parts[2], sign(`${parts[0]}.${parts[1]}`, config))
}

// Resolves to { token, expiresAt } for the right PIN. Throws 401 for a wrong
// PIN and 429 once a client has guessed wrong MAX_FAILURES times in a row.
export function login(rawPin, clientId, config, now = Date.now()) {
  const entry = failures.get(clientId)
  if (entry && entry.until > now) throw new HttpError(429, 'too_many_attempts')

  if (typeof rawPin !== 'string' || !sameString(rawPin.trim(), config.pin)) {
    const count = (entry?.count ?? 0) + 1
    failures.set(clientId, { count, until: count >= MAX_FAILURES ? now + LOCKOUT_MS : 0 })
    throw new HttpError(401, 'wrong_pin')
  }
  failures.delete(clientId)
  return issueToken(config, now)
}

export function clientIdOf(req) {
  return String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown'
}

// Wraps a Vercel handler so the teacher token is checked before anything else.
export function withTeacher(handler) {
  return async (req, res) => {
    try {
      const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
      if (!isValidToken(token, teacherConfig())) throw new HttpError(401, 'teacher_token_invalid')
      return await handler(req, res)
    } catch (err) {
      return sendError(res, err)
    }
  }
}
