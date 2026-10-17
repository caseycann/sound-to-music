// One-time setup: creates the Classes and Sounds tables in the Airtable base
// and seeds a TEST01 class. Safe to re-run: existing tables only get their
// missing fields added, and the seed record is skipped if present.
//
// Usage: node scripts/setup-airtable.mjs
//
// Needs AIRTABLE_PAT and AIRTABLE_BASE_ID in .env.local. The token needs the
// scopes schema.bases:read, schema.bases:write, data.records:read and
// data.records:write, with access to the base.

import { readFileSync } from 'node:fs'

const env = loadEnv(new URL('../.env.local', import.meta.url))
const TOKEN = env.AIRTABLE_PAT
const BASE_ID = env.AIRTABLE_BASE_ID
if (!TOKEN || !BASE_ID) {
  console.error('Missing AIRTABLE_PAT or AIRTABLE_BASE_ID in .env.local')
  process.exit(1)
}

const API = 'https://api.airtable.com/v0'

const text = (name) => ({ name, type: 'singleLineText' })
const checkbox = (name) => ({
  name,
  type: 'checkbox',
  options: { icon: 'check', color: 'greenBright' },
})
const number = (name, precision) => ({ name, type: 'number', options: { precision } })

const classesTable = {
  name: 'Classes',
  fields: [text('Code'), text('Name'), text('Teacher'), checkbox('Active')],
}

// Built after Classes exists, because the link field needs its table ID.
const soundsTable = (classesId) => ({
  name: 'Sounds',
  fields: [
    text('Onomatopoeia'),
    text('Descriptor 1'),
    text('Descriptor 2'),
    text('Source File Name'),
    text('Cloudinary ID'),
    { name: 'Audio URL', type: 'url' },
    number('Duration', 2),
    { name: 'Class', type: 'multipleRecordLinks', options: { linkedTableId: classesId } },
    number('Claude X', 2),
    number('Claude Y', 2),
    number('Confidence', 2),
    number('Audio X', 2),
    number('Audio Y', 2),
    number('Student X', 2),
    number('Student Y', 2),
    number('Final X', 2),
    number('Final Y', 2),
    checkbox('Needs review'),
    { name: 'Reason', type: 'multilineText' },
    {
      name: 'Status',
      type: 'singleSelect',
      options: { choices: [{ name: 'Pending' }, { name: 'Approved' }, { name: 'Rejected' }] },
    },
  ],
})

const { tables } = await airtable(`/meta/bases/${BASE_ID}/tables`)
const byName = new Map(tables.map((t) => [t.name, t]))

const classes = await ensureTable(classesTable)
await ensureTable(soundsTable(classes.id))
await seedTestClass()

console.log('Done.')

async function ensureTable(spec) {
  const existing = byName.get(spec.name)
  if (existing) {
    console.log(`Table "${spec.name}" already exists (${existing.id})`)
    await addMissingFields(existing, spec.fields)
    return existing
  }
  const created = await airtable(`/meta/bases/${BASE_ID}/tables`, {
    method: 'POST',
    body: JSON.stringify(spec),
  })
  console.log(`Created table "${spec.name}" (${created.id})`)
  return created
}

// Adds fields the table lacks. Names match case-insensitively; existing fields
// are never changed or removed.
async function addMissingFields(table, fields) {
  const have = new Set(table.fields.map((f) => f.name.toLowerCase()))
  for (const field of fields) {
    if (have.has(field.name.toLowerCase())) continue
    await airtable(`/meta/bases/${BASE_ID}/tables/${table.id}/fields`, {
      method: 'POST',
      body: JSON.stringify(field),
    })
    console.log(`  Added field "${field.name}"`)
  }
}

async function seedTestClass() {
  const formula = encodeURIComponent(`{Code}='TEST01'`)
  const { records } = await airtable(`/${BASE_ID}/Classes?maxRecords=1&filterByFormula=${formula}`)
  if (records.length) {
    console.log('Skip: class TEST01 already exists')
    return
  }
  await airtable(`/${BASE_ID}/Classes`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ fields: { Code: 'TEST01', Active: true } }] }),
  })
  console.log('Seeded class TEST01 (Active)')
}

async function airtable(path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`Airtable ${init.method ?? 'GET'} ${path} failed (${res.status}):`)
    console.error(JSON.stringify(body.error ?? body, null, 2))
    process.exit(1)
  }
  return body
}

// Minimal .env parser (Node 20.8 has no process.loadEnvFile).
function loadEnv(url) {
  const out = {}
  for (const line of readFileSync(url, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}
