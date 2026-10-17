import { HttpError, withClass } from './_lib/auth.js'

// POST { classCode } -> { ok: true, className }. Creates no records.
export default withClass(async (req, res, cls) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    throw new HttpError(405, 'method_not_allowed')
  }
  res.status(200).json({ ok: true, className: cls.name })
})
