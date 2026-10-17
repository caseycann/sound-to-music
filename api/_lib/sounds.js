import { getRecord } from './airtable.js'
import { HttpError } from './auth.js'

export const RECORD_ID =/^rec[A-Za-z0-9]{14}$/

// The Sounds record's fields, for a sound in this class. Throws 400 for a
// malformed ID and 404 if there is no such sound; a sound from another class
// looks the same as a missing one.
export async function getClassSound(soundId, cls) {
  if (typeof soundId !== 'string' || !RECORD_ID.test(soundId)) throw new HttpError(400, 'invalid_sound_id')
  const fields = (await getRecord('Sounds', soundId))?.fields
  if (!fields || !(fields.Class ?? []).includes(cls.id)) throw new HttpError(404, 'sound_not_found')
  return fields
}

export const isSet = (value) => value !== undefined && value !== null
