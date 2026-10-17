import { createHash } from 'node:crypto'

// Cloudinary helpers for /api functions. Server-only: reads the API secret.
// Uploads are always signed (CLAUDE.md rule 8). Audio is stored under
// resource_type "video", which is how Cloudinary handles sound files.

export const RESOURCE_TYPE = 'video'
export const ALLOWED_FORMATS = 'wav'

export function cloudinaryConfig() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary env vars are not set')
  }
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'found-sound',
  }
}

// Cloudinary's upload signature: the params sorted by name, joined as
// key=value with &, then the API secret appended, SHA-1 hex.
// https://cloudinary.com/documentation/authentication_signatures
export function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return createHash('sha1').update(toSign + apiSecret).digest('hex')
}

// The delivery URL that serves this public ID as WAV. Cloudinary picks the
// delivery format from the extension: our uploads are WAV already, so this is
// the original file, and anything else would be converted to WAV. WAV is what
// SuperSonic's decodeAudioData reads in every browser.
export function wavDeliveryUrl(cloudName, publicId) {
  const path = publicId.split('/').map(encodeURIComponent).join('/')
  return `https://res.cloudinary.com/${cloudName}/${RESOURCE_TYPE}/upload/${path}.${ALLOWED_FORMATS}`
}

// True if url is a secure delivery URL for this cloud's audio with this
// public ID, e.g. https://res.cloudinary.com/<cloud>/video/upload/v123/<publicId>.wav
export function isDeliveryUrlFor(url, cloudName, publicId) {
  const prefix = `https://res.cloudinary.com/${cloudName}/${RESOURCE_TYPE}/upload/`
  if (typeof url !== 'string' || !url.startsWith(prefix)) return false
  const rest = url.slice(prefix.length).replace(/^v\d+\//, '')
  return rest === `${publicId}.${ALLOWED_FORMATS}`
}
