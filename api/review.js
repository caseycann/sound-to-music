import { getRecord, listAllRecords, updateRecord } from './_lib/airtable.js'
import { HttpError } from './_lib/auth.js'
import { RECORD_ID } from './_lib/sounds.js'
import { withTeacher } from './_lib/teacher.js'

// Teacher review, across all classes. Needs a teacher token instead of a
// class code (CLAUDE.md rule 2).
//
// GET -> { ok, sounds: [{ id, onomatopoeia, descriptor1, descriptor2,
//          className, reason, needsReview, audioUrl, duration }] }
//   Pending sounds, flagged ones first, then oldest first.
// POST { soundId, status: 'Approved' | 'Rejected' } -> { ok }
const DECISIONS = new Set(['Approved', 'Rejected'])

export default withTeacher(async (req, res) => {
  if (req.method === 'GET') return listPending(res)
  if (req.method === 'POST') return decide(req.body ?? {}, res)
  res.setHeader('Allow', 'GET, POST')
  throw new HttpError(405, 'method_not_allowed')
})

async function listPending(res) {
  const [sounds, classes] = await Promise.all([
    listAllRecords('Sounds', { filterByFormula: `{Status}='Pending'` }),
    listAllRecords('Classes'),
  ])
  const classNames = new Map(classes.map((c) => [c.id, c.fields.Name || c.fields.Code || '']))

  const rows = sounds
    .sort((a, b) =>
      Number(Boolean(b.fields['Needs review'])) - Number(Boolean(a.fields['Needs review'])) ||
      a.createdTime.localeCompare(b.createdTime))
    .map(({ id, fields: f }) => ({
      id,
      onomatopoeia: f.Onomatopoeia ?? '',
      descriptor1: f['Descriptor 1'] ?? '',
      descriptor2: f['Descriptor 2'] ?? '',
      className: (f.Class ?? []).map((cid) => classNames.get(cid) ?? '').join(', '),
      reason: f.Reason ?? '',
      needsReview: Boolean(f['Needs review']),
      audioUrl: f['Audio URL'] ?? '',
      duration: f.Duration ?? 3,
    }))
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ok: true, sounds: rows })
}

async function decide({ soundId, status }, res) {
  if (typeof soundId !== 'string' || !RECORD_ID.test(soundId)) throw new HttpError(400, 'invalid_sound_id')
  if (!DECISIONS.has(status)) throw new HttpError(400, 'invalid_status')
  if (!(await getRecord('Sounds', soundId))) throw new HttpError(404, 'sound_not_found')
  await updateRecord('Sounds', soundId, { Status: status })
  res.status(200).json({ ok: true })
}
