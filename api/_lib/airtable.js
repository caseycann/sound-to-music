// Thin Airtable REST wrapper for /api functions. Server-only: reads the PAT.
const API = 'https://api.airtable.com/v0'

export async function listRecords(table, params = {}) {
  const { records } = await request(table, params)
  return records
}

// Like listRecords, but follows Airtable's offset to fetch every page (100
// records each).
export async function listAllRecords(table, params = {}) {
  const all = []
  let offset
  do {
    const page = await request(table, offset ? { ...params, offset } : params)
    all.push(...page.records)
    offset = page.offset
  } while (offset)
  return all
}

// Resolves to the created record ({ id, fields, createdTime }).
export async function createRecord(table, fields) {
  return request(table, {}, { method: 'POST', body: JSON.stringify({ fields }) })
}

// Resolves to the record, or null if there is no record with that ID.
// Airtable answers a missing record with 403 INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND
// rather than 404, so both count as "not found".
export async function getRecord(table, id) {
  try {
    return await request(table, {}, {}, id)
  } catch (err) {
    if (err.status === 403 || err.status === 404) return null
    throw err
  }
}

// Patches only the given fields. Resolves to the updated record.
export async function updateRecord(table, id, fields) {
  return request(table, {}, { method: 'PATCH', body: JSON.stringify({ fields }) }, id)
}

async function request(table, params, init = {}, recordId) {
  const { AIRTABLE_PAT, AIRTABLE_BASE_ID } = process.env
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
    throw new Error('Airtable env vars are not set')
  }
  const qs = new URLSearchParams(params).toString()
  const record = recordId ? `/${encodeURIComponent(recordId)}` : ''
  const url = `${API}/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}${record}${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = new Error(`Airtable ${res.status}: ${await res.text().catch(() => '')}`)
    err.status = res.status
    throw err
  }
  return res.json()
}
