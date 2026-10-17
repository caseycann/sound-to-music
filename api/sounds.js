import { toCoordinate } from '../shared/position.js'
import { checkWords } from '../shared/words.js'
import { createRecord } from './_lib/airtable.js'
import { HttpError, withClass } from './_lib/auth.js'
import { cloudinaryConfig, isDeliveryUrlFor } from './_lib/cloudinary.js'

// Longest clip we accept, in seconds. Clips are cut to 3 s; this leaves room
// for rounding in the encoder.
const MAX_DURATION_S = 3.5
const MAX_FILE_NAME = 200

// POST { classCode, publicId, secureUrl, duration, originalName,
//        onomatopoeia, descriptor1, descriptor2, audioX, audioY }
// -> { ok, id }. Creates a Sounds record with Status "Pending". Placement by
// Claude (/api/place) happens separately, and approves the sound unless it
// needs review.
export default withClass(async (req, res, cls) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    throw new HttpError(405, 'method_not_allowed')
  }
  const body = req.body ?? {}

  const { words, problems } = checkWords(body)
  if (Object.keys(problems).length) throw new HttpError(400, 'invalid_words')

  // Only accept uploads that landed in our folder on our cloud.
  const { cloudName, folder } = cloudinaryConfig()
  const { publicId, secureUrl } = body
  if (typeof publicId !== 'string' || !publicId.startsWith(`${folder}/`) || publicId.length > 255) {
    throw new HttpError(400, 'invalid_upload')
  }
  if (!isDeliveryUrlFor(secureUrl, cloudName, publicId)) throw new HttpError(400, 'invalid_upload')

  const duration = Number(body.duration)
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_DURATION_S) {
    throw new HttpError(400, 'invalid_duration')
  }

  const record = await createRecord('Sounds', {
    Onomatopoeia: words.onomatopoeia,
    'Descriptor 1': words.descriptor1,
    'Descriptor 2': words.descriptor2,
    'Source File Name': typeof body.originalName === 'string' ? body.originalName.slice(0, MAX_FILE_NAME) : '',
    'Cloudinary ID': publicId,
    'Audio URL': secureUrl,
    Duration: Math.round(duration * 100) / 100,
    Class: [cls.id],
    'Audio X': toCoordinate(body.audioX),
    'Audio Y': toCoordinate(body.audioY),
    Status: 'Pending',
  })
  res.status(201).json({ ok: true, id: record.id })
})
