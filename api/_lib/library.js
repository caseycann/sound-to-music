import { toCoordinate } from '../../shared/position.js'
import { quadrantOf } from '../../shared/quadrants.js'
import { listAllRecords } from './airtable.js'
import { cloudinaryConfig, wavDeliveryUrl } from './cloudinary.js'

// The class's sound library for /api/library: every Approved sound, cached
// per class for CACHE_MS. Per serverless instance; a cold start begins empty,
// so a teacher's approval can take up to CACHE_MS to show up.

export const CACHE_MS = 5 * 60_000

// Class ID -> { promise, expires }. Holding the promise means requests that
// arrive while Airtable is still paging share one fetch.
const cache = new Map()

// Resolves to the library for cls ({ id, code } from requireClass).
export function getLibrary(cls, now = Date.now()) {
  const hit = cache.get(cls.id)
  if (hit && hit.expires > now) return hit.promise

  const promise = fetchLibrary(cls)
  cache.set(cls.id, { promise, expires: now + CACHE_MS })
  // Don't keep a failure for five minutes.
  promise.catch(() => {
    if (cache.get(cls.id)?.promise === promise) cache.delete(cls.id)
  })
  return promise
}

export function clearLibraryCache() {
  cache.clear()
}

async function fetchLibrary(cls) {
  const { cloudName } = cloudinaryConfig()
  const records = await listAllRecords('Sounds', { filterByFormula: approvedInClass(cls.code) })
  return records
    // The formula matches on the class's Code; this checks the link itself.
    .filter((record) => (record.fields.Class ?? []).includes(cls.id))
    .sort((a, b) => a.createdTime.localeCompare(b.createdTime))
    .map((record) => toLibrarySound(record, cloudName))
    .filter(Boolean)
}

// A linked field in a formula reads as its records' primary field (Code),
// so this keeps Airtable from sending every class's sounds. code has passed
// requireClass's /^[A-Z0-9]{3,20}$/, so it is safe inside the formula.
export function approvedInClass(code) {
  const codes = `SUBSTITUTE(UPPER(ARRAYJOIN({Class}, ',')), ' ', '')`
  return `AND({Status}='Approved', FIND(',${code},', ',' & ${codes} & ','))`
}

// One library entry, or null if the sound has no audio or no Final X/Y yet.
export function toLibrarySound({ id, fields: f }, cloudName) {
  const finalX = toCoordinate(f['Final X'])
  const finalY = toCoordinate(f['Final Y'])
  const publicId = f['Cloudinary ID']
  if (finalX === null || finalY === null || typeof publicId !== 'string' || !publicId) return null
  return {
    id,
    onomatopoeia: f.Onomatopoeia ?? '',
    descriptors: [f['Descriptor 1'] ?? '', f['Descriptor 2'] ?? ''],
    audioUrl: wavDeliveryUrl(cloudName, publicId),
    finalX,
    finalY,
    quadrant: quadrantOf(finalX, finalY),
  }
}
