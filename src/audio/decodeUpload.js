// Checks and decodes a file a student picked.

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024
// Decoded audio takes far more memory than the file (a 100 MB MP3 is about
// 2 GB decoded), so very long recordings are refused after decoding.
export const MAX_RECORDING_S = 10 * 60

// Decoding straight to 44.1 kHz (the rate we store) means the long recording
// is only resampled once.
const DECODE_RATE = 44100

const EXPORT_TIP = 'On your recorder or computer, export the part you want as a WAV or MP3 file and upload that instead.'

export class UploadError extends Error {}

// Rounded up, so a file just over the limit never reads as "100 MB, and the limit is 100 MB".
const formatMB = (bytes) => `${Math.ceil(bytes / 1024 / 1024)} MB`

// Types a browser reports for files that are certainly not sound recordings.
// (Many audio files arrive with no type at all, so an empty type is allowed.)
const NOT_AUDIO = /^(image|text|application\/(pdf|zip|msword|vnd\.))/

// Resolves with an AudioBuffer. Throws UploadError with a message for students.
export async function decodeUpload(file) {
  if (file.size === 0) throw new UploadError(`“${file.name}” is empty. ${EXPORT_TIP}`)
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`“${file.name}” is ${formatMB(file.size)}, and the limit is ${formatMB(MAX_UPLOAD_BYTES)}. ${EXPORT_TIP}`)
  }
  if (NOT_AUDIO.test(file.type)) {
    throw new UploadError(`“${file.name}” isn’t a sound file. Choose a recording (WAV, MP3, FLAC or M4A).`)
  }

  let audio
  try {
    const decoder = new OfflineAudioContext(1, 1, DECODE_RATE)
    audio = await decoder.decodeAudioData(await file.arrayBuffer())
  } catch (err) {
    console.error('Could not decode upload', err)
    if (err?.name === 'RangeError' || /memory/i.test(err?.message ?? '')) {
      throw new UploadError(`“${file.name}” is too long to open here. ${EXPORT_TIP}`)
    }
    throw new UploadError(`We couldn’t open “${file.name}” as audio. It may be damaged, or in a format this browser can’t read. ${EXPORT_TIP}`)
  }
  if (audio.length === 0) throw new UploadError(`“${file.name}” has no sound in it. ${EXPORT_TIP}`)
  if (audio.duration > MAX_RECORDING_S) {
    const minutes = Math.round(audio.duration / 60)
    throw new UploadError(`“${file.name}” is ${minutes} minutes long, and the limit is ${MAX_RECORDING_S / 60} minutes. ${EXPORT_TIP}`)
  }
  return audio
}
