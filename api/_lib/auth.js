import { listRecords } from './airtable.js'

// The class-code check every /api function runs first (CLAUDE.md rule 2).
// Wrap a handler with withClass(), or call requireClass() yourself before
// touching any data.

const CACHE_MS = 60_000
// Codes are letters and digits only, so they can go into an Airtable formula
// without escaping, and junk input never reaches Airtable.
const CODE_PATTERN = /^[A-Z0-9]{3,20}$/

// Normalized code -> { value: class | null, expires }. Misses are cached too,
// so repeated guesses don't each cost an Airtable call. Per serverless
// instance; a cold start begins empty.
const cache = new Map()

export class HttpError extends Error {
  constructor(status, code) {
    super(code)
    this.status = status
    this.code = code
  }
}

export function normalizeCode(raw) {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : ''
}

// Resolves to { id, code, name } for an active class. Throws HttpError(401)
// if the code is malformed, unknown, or not Active. Airtable failures throw
// a plain Error (the caller should answer 503, not 401).
export async function requireClass(rawCode) {
  const code = normalizeCode(rawCode)
  if (!CODE_PATTERN.test(code)) throw new HttpError(401, 'invalid_class_code')

  const cls = await lookupClass(code)
  if (!cls) throw new HttpError(401, 'invalid_class_code')
  return cls
}

async function lookupClass(code) {
  const now = Date.now()
  const hit = cache.get(code)
  if (hit && hit.expires > now) return hit.value

  const records = await listRecords('Classes', {
    filterByFormula: `UPPER(TRIM({Code}))='${code}'`,
    maxRecords: '1',
  })
  const fields = records[0]?.fields
  const value = fields?.Active ? { id: records[0].id, code, name: fields.Name ?? '' } : null

  pruneExpired(now)
  cache.set(code, { value, expires: now + CACHE_MS })
  return value
}

function pruneExpired(now) {
  for (const [key, entry] of cache) {
    if (entry.expires <= now) cache.delete(key)
  }
}

// Wraps a Vercel handler so the class check runs before anything else. The
// code comes from the JSON body's classCode or the X-Class-Code header. The
// handler receives the class as a third argument.
export function withClass(handler) {
  return async (req, res) => {
    let cls
    try {
      cls = await requireClass(req.body?.classCode ?? req.headers['x-class-code'])
    } catch (err) {
      return sendError(res, err)
    }
    try {
      return await handler(req, res, cls)
    } catch (err) {
      return sendError(res, err)
    }
  }
}

export function sendError(res, err) {
  if (err instanceof HttpError) return res.status(err.status).json({ ok: false, error: err.code })
  console.error(err)
  return res.status(503).json({ ok: false, error: 'server_unavailable' })
}
