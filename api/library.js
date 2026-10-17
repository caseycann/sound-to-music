import { HttpError, withClass } from './_lib/auth.js'
import { CACHE_MS, getLibrary } from './_lib/library.js'

// GET (X-Class-Code header) -> { ok, sounds: [{ id, onomatopoeia,
//   descriptors: [d1, d2], audioUrl, finalX, finalY, quadrant }] }
// Every Approved sound in the caller's class, oldest first. audioUrl is
// Cloudinary's WAV delivery URL.
export default withClass(async (req, res, cls) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    throw new HttpError(405, 'method_not_allowed')
  }
  const sounds = await getLibrary(cls)
  // private: the answer depends on the class code header, so only the
  // student's own browser may cache it, never Vercel's shared CDN.
  res.setHeader('Cache-Control', `private, max-age=${CACHE_MS / 1000}`)
  res.setHeader('Vary', 'X-Class-Code')
  res.status(200).json({ ok: true, sounds })
})
