import { toCoordinate } from '../shared/position.js'
import { updateRecord } from './_lib/airtable.js'
import { HttpError, withClass } from './_lib/auth.js'
import { getClassSound, isSet } from './_lib/sounds.js'

// POST { classCode, soundId, x, y } -> { ok, x, y }
// Saves where the student placed their sound: Student X/Y, and Final X/Y
// (what the field shows). Set once per sound: a sound that already has
// Student X answers 409, so nobody can move other students' dots later.
export default withClass(async (req, res, cls) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    throw new HttpError(405, 'method_not_allowed')
  }

  const body = req.body ?? {}
  const x = toCoordinate(body.x)
  const y = toCoordinate(body.y)
  if (x === null || y === null) throw new HttpError(400, 'invalid_position')

  const f = await getClassSound(body.soundId, cls)
  if (isSet(f['Student X'])) throw new HttpError(409, 'already_placed')

  await updateRecord('Sounds', body.soundId, { 'Student X': x, 'Student Y': y, 'Final X': x, 'Final Y': y })
  res.status(200).json({ ok: true, x, y })
})
