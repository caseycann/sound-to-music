import { toCoordinate } from '../../shared/position.js'
import { notifyLibraryChanged } from '../library/libraryEvents.js'
import { RequestError, postJson, requestJson } from '../net/request.js'

// Saves a finished clip: get a signature from /api/sign-upload, upload the
// WAV straight to Cloudinary, record it with /api/sounds, then ask
// /api/place for Claude's position. Placing (which may approve the sound)
// and the student's own spot both tell an open Jam to refetch the library.
//
// Errors are RequestErrors (src/net/request.js): status 401 means the class
// code stopped working; anything else is worth retrying.

const KEPT = 'Your sound and words are still here, so press Save sound to try again.'

const SAVE_MESSAGES = {
  invalid_words: 'One of your words isn’t allowed. Check them and try again.',
  invalid_duration: 'That clip is too long to save. Choose up to 3 seconds again.',
}

// The upload takes longest (a slow school network); placing waits on Claude,
// which has its own 20 s timeout and one retry on the server.
const UPLOAD_TIMEOUT_MS = 60_000
const PLACE_TIMEOUT_MS = 60_000

// clip: Uploader's clip. words: normalized { onomatopoeia, descriptor1,
// descriptor2 }. progress: an object the caller keeps for this clip between
// tries; the finished upload is stored on it, so trying again after a later
// step failed doesn't upload the same clip twice.
// Resolves with { id, url, audio, placement }: audio is the in-browser
// { x, y } estimate, and placement is /api/place's { claude, audio, final,
// needsReview, reason }, or null if placing failed. The sound is saved
// either way: /api/sounds already gives it the audio position, flagged for
// the teacher.
export async function saveSound({ classCode, clip, words, progress = {} }) {
  try {
    if (!progress.upload) {
      const signed = await postJson('/api/sign-upload', { classCode })
      progress.upload = await uploadToCloudinary(signed, clip.blob)
    }
    const { upload } = progress

    const { id } = await postJson('/api/sounds', {
      classCode,
      publicId: upload.public_id,
      secureUrl: upload.secure_url,
      duration: upload.duration ?? clip.duration,
      originalName: clip.originalName,
      ...words,
      audioX: clip.analysis?.audioX ?? null,
      audioY: clip.analysis?.audioY ?? null,
    }, { messages: SAVE_MESSAGES })

    const audio = point(clip.analysis?.audioX, clip.analysis?.audioY)
    return { id, url: upload.secure_url, audio, placement: await place(classCode, id) }
  } catch (err) {
    // Messages that already say what to do (SAVE_MESSAGES) stand alone.
    if (err instanceof RequestError && err.status !== 401 && !SAVE_MESSAGES[err.code]) err.message = `${err.message} ${KEPT}`
    throw err
  }
}

// Saves where the student put their sound. Resolves with the stored { x, y }.
export async function saveStudentPosition({ classCode, soundId, x, y }) {
  const saved = await postJson('/api/student-position', { classCode, soundId, x, y }, {
    messages: { sound_not_found: 'This sound belongs to a class you’re not in any more, so it can’t be placed here.' },
  })
  notifyLibraryChanged()
  return { x: saved.x, y: saved.y }
}

function point(x, y) {
  const px = toCoordinate(x)
  const py = toCoordinate(y)
  return px === null || py === null ? null : { x: px, y: py }
}

async function place(classCode, soundId) {
  try {
    const { claude, audio, final, needsReview, reason } = await postJson(
      '/api/place',
      { classCode, soundId },
      { timeoutMs: PLACE_TIMEOUT_MS },
    )
    notifyLibraryChanged()
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

  try {
    return await requestJson(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: form,
      timeoutMs: UPLOAD_TIMEOUT_MS,
      messages: {
        network: 'Could not reach the upload server. Check your connection.',
        timeout: 'The upload took too long. Your connection may be slow.',
        400: 'The upload was refused.',
        401: 'The upload was refused.',
      },
    })
  } catch (err) {
    // Cloudinary's 401 is a bad or expired signature, not our class code:
    // it must not end the session. A new try signs again.
    if (err.status === 401) throw new RequestError(502, err.message, 'upload_refused')
    throw err
  }
}
