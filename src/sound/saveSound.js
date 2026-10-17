import { toCoordinate } from '../../shared/position.js'

// Saves a finished clip: get a signature from /api/sign-upload, upload the
// WAV straight to Cloudinary, record it with /api/sounds, then ask
// /api/place for Claude's position.

export class SaveError extends Error {
  // status 401 means the class code stopped working; the caller should leave
  // the session. Anything else is worth retrying.
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const RETRY = 'Something went wrong saving your sound. Try again.'

// clip: Uploader's clip. words: normalized { onomatopoeia, descriptor1,
// descriptor2 }. Resolves with { id, url, audio, placement }: audio is the
// in-browser { x, y } estimate, and placement is /api/place's { claude,
// audio, final, needsReview, reason }, or null if placing failed (the sound
// is saved either way).
export async function saveSound({ classCode, clip, words }) {
  const signed = await postJson('/api/sign-upload', { classCode })
  const upload = await uploadToCloudinary(signed, clip.blob)

  const { id } = await postJson('/api/sounds', {
    classCode,
    publicId: upload.public_id,
    secureUrl: upload.secure_url,
    duration: upload.duration ?? clip.duration,
    originalName: clip.originalName,
    ...words,
    audioX: clip.analysis?.audioX ?? null,
    audioY: clip.analysis?.audioY ?? null,
  })

  const audio = point(clip.analysis?.audioX, clip.analysis?.audioY)
  return { id, url: upload.secure_url, audio, placement: await place(classCode, id) }
}

// Saves where the student put their sound. Resolves with the stored { x, y }.
export async function saveStudentPosition({ classCode, soundId, x, y }) {
  const saved = await postJson('/api/student-position', { classCode, soundId, x, y })
  return { x: saved.x, y: saved.y }
}

function point(x, y) {
  const px = toCoordinate(x)
  const py = toCoordinate(y)
  return px === null || py === null ? null : { x: px, y: py }
}

async function place(classCode, soundId) {
  try {
    const { claude, audio, final, needsReview, reason } = await postJson('/api/place', { classCode, soundId })
    return { claude, audio, final, needsReview, reason }
  } catch (err) {
    if (err.status === 401) throw err
    console.error('Placing sound failed', err)
    return null
  }
}

async function uploadToCloudinary({ cloudName, apiKey, resourceType, params, signature }, blob) {
  const form = new FormData()
  form.append('file', blob, 'clip.wav')
  form.append('api_key', apiKey)
  form.append('signature', signature)
  for (const [key, value] of Object.entries(params)) form.append(key, value)

  let res
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: form,
    })
  } catch {
    throw new SaveError(0, 'Could not reach the upload server. Check your connection and try again.')
  }
  if (!res.ok) {
    console.error('Cloudinary upload failed', res.status, await res.text().catch(() => ''))
    throw new SaveError(res.status, RETRY)
  }
  return res.json()
}

async function postJson(url, body) {
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new SaveError(0, 'Could not reach the server. Check your connection and try again.')
  }
  if (res.status === 401) throw new SaveError(401, 'Your class code stopped working.')
  if (!res.ok) {
    console.error(`${url} failed`, res.status, await res.text().catch(() => ''))
    throw new SaveError(res.status, RETRY)
  }
  return res.json()
}
