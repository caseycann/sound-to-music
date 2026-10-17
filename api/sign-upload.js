import { HttpError, withClass } from './_lib/auth.js'
import { ALLOWED_FORMATS, RESOURCE_TYPE, cloudinaryConfig, signParams } from './_lib/cloudinary.js'

// POST { classCode } -> { ok, cloudName, apiKey, resourceType, params, signature }.
// The browser posts the WAV to Cloudinary with exactly these params plus
// api_key and signature. The API key is not secret; the API secret never
// leaves the server. Signatures expire about an hour after `timestamp`.
export default withClass(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    throw new HttpError(405, 'method_not_allowed')
  }

  // TODO(rule 5): refuse students flagged "opted out of recording" with
  // 403 'recording_opted_out'. Needs the Students table and anonymous IDs,
  // which don't exist yet.

  const { cloudName, apiKey, apiSecret, folder } = cloudinaryConfig()
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    folder,
    timestamp: Math.floor(Date.now() / 1000),
  }
  res.status(200).json({
    ok: true,
    cloudName,
    apiKey,
    resourceType: RESOURCE_TYPE,
    params,
    signature: signParams(params, apiSecret),
  })
})
