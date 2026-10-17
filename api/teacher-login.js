import { HttpError, sendError } from './_lib/auth.js'
import { clientIdOf, login, teacherConfig } from './_lib/teacher.js'

// POST { pin } -> { ok, token, expiresAt }. An exception to the class-code
// rule (CLAUDE.md rule 2): it touches no data, and the PIN is its check.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      throw new HttpError(405, 'method_not_allowed')
    }
    const { token, expiresAt } = login(req.body?.pin, clientIdOf(req), teacherConfig())
    res.status(200).json({ ok: true, token, expiresAt })
  } catch (err) {
    sendError(res, err)
  }
}
