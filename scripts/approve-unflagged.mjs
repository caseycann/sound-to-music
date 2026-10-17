// One-off backfill: gives sounds placed before auto-approval the Status
// /api/place would give them now (placedStatus). Unflagged Pending or
// blank-Status sounds become Approved; flagged blank-Status ones become
// Pending, so they show up on /review. Sounds that were never placed (no
// Final X) and teacher decisions are left alone.
//
// Usage: node --env-file=.env.local scripts/approve-unflagged.mjs [--apply]
// Without --apply it only lists what it would change.

import { listAllRecords, updateRecord } from '../api/_lib/airtable.js'
import { placedStatus } from '../api/_lib/placement.js'
import { isSet } from '../api/_lib/sounds.js'

const apply = process.argv.includes('--apply')

const sounds = await listAllRecords('Sounds')
const changes = sounds
  .filter(({ fields: f }) => isSet(f['Final X']))
  .map(({ id, fields: f }) => ({ id, f, status: placedStatus(f.Status, Boolean(f['Needs review'])) }))
  .filter(({ f, status }) => status && status !== f.Status)

for (const { id, f, status } of changes) {
  const words = [f.Onomatopoeia, f['Descriptor 1'], f['Descriptor 2']].join(' / ')
  console.log(`${id}  ${f.Status ?? '(blank)'} -> ${status}  ${words}`)
  if (apply) await updateRecord('Sounds', id, { Status: status })
}
console.log(`${changes.length} of ${sounds.length} sounds ${apply ? 'updated' : 'would change (dry run; add --apply)'}`)
