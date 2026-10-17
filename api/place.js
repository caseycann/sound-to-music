import Anthropic from '@anthropic-ai/sdk'
import { updateRecord } from './_lib/airtable.js'
import { HttpError, withClass } from './_lib/auth.js'
import { DEFAULT_MODEL, OUTPUT_SCHEMA, SYSTEM_PROMPT, blend, buildUserMessage, validatePlacement } from './_lib/placement.js'
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
// re-scored; its stored positions are returned instead.

// Lazily created so a missing key fails the request (503), not the import.
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
  const final = blend(claude, audio)
  if (!final) throw new HttpError(502, 'placement_unavailable')

  // Never overwrite a spot the student already chose.
  const studentPlaced = isSet(f['Student X'])
  const reason = claude?.reason ?? 'We placed this one from the audio alone.'
  await updateRecord('Sounds', soundId, {
    // Left empty after a refusal, so the sound can be scored again later.
    ...(claude && { 'Claude X': claude.x, 'Claude Y': claude.y }),
    Confidence: claude?.confidence ?? 0,
    'Needs review': final.needsReview,
    Reason: reason,
    ...(!studentPlaced && { 'Final X': final.x, 'Final Y': final.y }),
  })

  res.status(200).json({
    ok: true,
    claude: claude && { x: claude.x, y: claude.y },
    audio,
    final: studentPlaced ? point(f['Final X'], f['Final Y']) : { x: final.x, y: final.y },
    needsReview: final.needsReview,
    reason,
    alreadyPlaced: false,
  })
})

// Resolves to validatePlacement's result, or null if Claude declined.
// Throws HttpError(502) if the call fails or the output is unusable.
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
    if (err instanceof Anthropic.APIError) {
      console.error('place: Claude API error', err.status, err.message)
      throw new HttpError(502, 'placement_unavailable')
    }
    throw err
  }

  if (response.stop_reason === 'refusal') {
    console.warn('place: Claude declined', response.stop_details?.category ?? '')
    return null
  }
  if (response.stop_reason !== 'end_turn') {
    console.error('place: unexpected stop_reason', response.stop_reason)
    throw new HttpError(502, 'placement_unavailable')
  }

  const text = response.content.find((block) => block.type === 'text')?.text
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = null
  }
  const placement = validatePlacement(parsed)
  if (!placement) {
    console.error('place: invalid output', text)
    throw new HttpError(502, 'placement_unavailable')
  }
  return placement
}
