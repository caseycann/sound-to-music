// Thin Airtable REST wrapper for /api functions. Server-only: reads the PAT.
const API = 'https://api.airtable.com/v0'

export async function listRecords(table, params = {}) {
  const { AIRTABLE_PAT, AIRTABLE_BASE_ID } = process.env
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
    throw new Error('Airtable env vars are not set')
  }
  const qs = new URLSearchParams(params).toString()
  const url = `${API}/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}${qs ? `?${qs}` : ''}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } })
  if (!res.ok) throw new Error(`Airtable ${res.status}`)
  const { records } = await res.json()
  return records
}
