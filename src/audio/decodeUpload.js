// Checks and decodes a file a student picked.

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

// Decoding straight to 44.1 kHz (the rate we store) means the long recording
// is only resampled once.
const DECODE_RATE = 44100

const EXPORT_TIP = 'On your recorder or computer, export the part you want as a WAV file and upload that instead.'

export class UploadError extends Error {}

const formatMB = (bytes) => `${Math.round(bytes / 1024 / 1024)} MB`

// Resolves with an AudioBuffer. Throws UploadError with a message for students.
export async function decodeUpload(file) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`“${file.name}” is ${formatMB(file.size)}, and the limit is ${formatMB(MAX_UPLOAD_BYTES)}. ${EXPORT_TIP}`)
  }
  let audio
  try {
    const decoder = new OfflineAudioContext(1, 1, DECODE_RATE)
    audio = await decoder.decodeAudioData(await file.arrayBuffer())
  } catch (err) {
    console.error('Could not decode upload', err)
    throw new UploadError(`We couldn’t open “${file.name}” as audio. ${EXPORT_TIP}`)
  }
  if (audio.length === 0) throw new UploadError(`“${file.name}” has no sound in it. ${EXPORT_TIP}`)
  return audio
}
