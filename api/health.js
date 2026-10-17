import { listRecords } from './_lib/airtable.js'

// Liveness check, and the one documented exception to the class-code rule in
// CLAUDE.md. It reads at most one Classes record to prove Airtable is
// reachable, and returns only the count, never any field values.
export default async function handler(req, res) {
  try {
    const records = await listRecords('Classes', { maxRecords: '1' })
    res.status(200).json({ ok: true, classes: records.length })
  } catch (err) {
    console.error('health: Airtable check failed', err)
    res.status(503).json({ ok: false, error: 'airtable_unreachable' })
  }
}
