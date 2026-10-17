import { AMP, ATTACK, BPM, CUTOFF, LOOP_BARS, OFFSET, RATE, RELEASE, REVERB, clamp } from './limits.js'

// The whole jam in one reducer, so it can be saved as a recipe later.
//   { bpm, tracks: [track], usedIds: [soundId] }
// A track is { id, soundId, bufferNumber, rate, attack, release, amp, cutoff,
// reverb, offset, muted, bars, loop } (see tracks.js). usedIds only grows: a sound is used once per session
// (CLAUDE.md rule 4), so removing its track doesn't give it back.

export const MAX_TRACKS = 8

export const initialJam = { bpm: BPM.initial, tracks: [], usedIds: [] }

const TRACK_LIMITS = { rate: RATE, attack: ATTACK, release: RELEASE, amp: AMP, cutoff: CUTOFF, reverb: REVERB }

function cleanPatch(patch) {
  const clean = {}
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'muted' || key === 'loop') clean[key] = Boolean(value)
    else if (key === 'offset' && Number.isFinite(value)) clean.offset = clamp(Math.round(value / OFFSET.step) * OFFSET.step, OFFSET)
    else if (key === 'bars' && Array.isArray(value) && value.length === LOOP_BARS) clean.bars = value.map(Boolean)
    else if (TRACK_LIMITS[key] && Number.isFinite(value)) clean[key] = clamp(value, TRACK_LIMITS[key])
  }
  return clean
}

export const canAddTrack = (jam) => jam.tracks.length < MAX_TRACKS

export function jamReducer(jam, action) {
  switch (action.type) {
    case 'addTrack': {
      const { track } = action
      if (!canAddTrack(jam)) return jam
      if (track.soundId != null && jam.usedIds.includes(track.soundId)) return jam
      return {
        ...jam,
        tracks: [...jam.tracks, track],
        usedIds: track.soundId != null ? [...jam.usedIds, track.soundId] : jam.usedIds,
      }
    }
    case 'updateTrack': {
      const patch = cleanPatch(action.patch)
      return { ...jam, tracks: jam.tracks.map((t) => (t.id === action.id ? { ...t, ...patch } : t)) }
    }
    case 'removeTrack':
      return { ...jam, tracks: jam.tracks.filter((t) => t.id !== action.id) }
    case 'setBpm':
      return Number.isFinite(action.bpm) ? { ...jam, bpm: clamp(Math.round(action.bpm), BPM) } : jam
    default:
      throw new Error(`Unknown jam action: ${action.type}`)
  }
}

// What a saved recipe would hold: the settings, without buffer numbers or
// track ids, which only mean something in this browser session.
export function toRecipe(jam) {
  return {
    bpm: jam.bpm,
    tracks: jam.tracks.map(({ soundId, rate, attack, release, amp, cutoff, reverb, offset, muted, bars, loop }) => ({
      soundId, rate, attack, release, amp, cutoff, reverb, offset, muted, bars, loop,
    })),
  }
}
