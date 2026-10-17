import { HttpError, withClass } from './_lib/auth.js'
import { getLibrary } from './_lib/library.js'

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
  // no-store: the Jam refetches to pick up new sounds, so the browser must
  // not answer from its own cache, and Vercel's shared CDN must never cache
  // an answer that depends on the class code header. The server's own
  // short cache (getLibrary) keeps the load off Airtable.
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ok: true, sounds })
})
