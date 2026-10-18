import Anthropic from '@anthropic-ai/sdk'
import { updateRecord } from './_lib/airtable.js'
import { HttpError, withClass } from './_lib/auth.js'
import { DEFAULT_MODEL, OUTPUT_SCHEMA, SYSTEM_PROMPT, blend, buildUserMessage, placedStatus, validatePlacement } from './_lib/placement.js'
import { invalidateLibrary } from './_lib/library.js'
import { getClassSound, isSet } from './_lib/sounds.js'

// The only place Claude is called (CLAUDE.md).
//
// POST { classCode, soundId }
// -> { ok, claude: { x, y } | null, audio: { x, y } | null, final: { x, y },
//      needsReview, reason, alreadyPlaced }
// Asks Claude Haiku where the sound's words put it on the field and stores
// that, plus a default final position (the blend of Claude and the audio
// estimate). The student then places it themselves; claude and audio are
// shown to them as ghost dots. A sound that already has Claude X is never
// re-scored; its stored positions are returned instead. Placing also sets
// Status: Approved unless Needs review is set (see placedStatus).
//
// If Claude fails (an API error, a timeout, a refusal or unusable output),
// the sound is still placed from the audio alone and flagged for review;
// the student never sees a failed save because of it. With no audio estimate
// either, final is null, the sound stays flagged, and the student's own spot
// (/api/student-position) gives it a place.

// Lazily created, inside askClaude's try, so a missing key only skips Claude.
let client
const anthropic = () => (client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 }))

const point = (x, y) => (isSet(x) && isSet(y) ? { x, y } : null)

export default withClass(async (req, res, cls) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    throw new HttpError(405, 'method_not_allowed')
  }

  const { soundId } = req.body ?? {}
  const f = await getClassSound(soundId, cls)
  const audio = point(f['Audio X'], f['Audio Y'])

  if (isSet(f['Claude X'])) {
    return res.status(200).json({
      ok: true,
      claude: point(f['Claude X'], f['Claude Y']),
      audio,
      final: point(f['Final X'], f['Final Y']),
      needsReview: Boolean(f['Needs review']),
      reason: f.Reason ?? '',
      alreadyPlaced: true,
    })
  }

  const claude = await askClaude({
    onomatopoeia: f.Onomatopoeia,
    descriptor1: f['Descriptor 1'],
    descriptor2: f['Descriptor 2'],
  })
  // null when neither Claude nor the audio gave a position.
  const final = blend(claude, audio)
  const needsReview = final?.needsReview ?? true

  // Never overwrite a spot the student already chose.
  const studentPlaced = isSet(f['Student X'])
  const reason = claude?.reason ?? (audio ? 'We placed this one from the audio alone.' : 'We couldn’t place this one.')
  const status = placedStatus(f.Status, needsReview)
  await updateRecord('Sounds', soundId, {
    // Left empty when Claude failed, so the sound can be scored again later.
    ...(claude && { 'Claude X': claude.x, 'Claude Y': claude.y }),
    Confidence: claude?.confidence ?? 0,
    'Needs review': needsReview,
    Reason: reason,
    ...(final && !studentPlaced && { 'Final X': final.x, 'Final Y': final.y }),
    ...(status && { Status: status }),
  })
  invalidateLibrary([cls.id]) // it may just have been Approved, or moved

  res.status(200).json({
    ok: true,
    claude: claude && { x: claude.x, y: claude.y },
    audio,
    final: studentPlaced || !final ? point(f['Final X'], f['Final Y']) : { x: final.x, y: final.y },
    needsReview,
    reason,
    alreadyPlaced: false,
  })
})

// Resolves to validatePlacement's result, or null if Claude declined or
// failed in any way (logged here). Never throws: placement falls back to
// the audio estimate.
async function askClaude(words) {
  let response
  try {
    // Claude Haiku 5.5 rejects non-default temperature (400), so it is left
    // unset; low effort keeps thinking short. max_tokens leaves room for that
    // thinking plus the small JSON answer.
    response = await anthropic().messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(words) }],
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
      },
    })
  } catch (err) {
    // API errors, timeouts, and a missing API key all land here.
    console.error('place: Claude call failed', err?.status ?? '', err?.message ?? err)
    return null
  }

  if (response.stop_reason === 'refusal') {
    console.warn('place: Claude declined', response.stop_details?.category ?? '')
    return null
  }
  if (response.stop_reason !== 'end_turn') {
    console.error('place: unexpected stop_reason', response.stop_reason)
    return null
  }

  const text = response.content.find((block) => block.type === 'text')?.text
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = null
  }
  const placement = validatePlacement(parsed)
  if (!placement) console.error('place: invalid output', text)
  return placement
}
