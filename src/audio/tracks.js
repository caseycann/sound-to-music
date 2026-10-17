import { AMP, CUTOFF, LOOP_BARS, OFFSET, REVERB } from './limits.js'

// Track model: one looping layer in the jam.
//   { id, soundId, bufferNumber, rate, attack, release, amp, cutoff, reverb,
//     offset, muted, bars, loop }
// soundId is the library sound (null for the test sound), rate is a playback
// rate (1 = original pitch, 2 = an octave up), attack and release are
// seconds, amp is linear gain, cutoff is the low-pass filter as a MIDI note,
// reverb is the reverb mix (0 dry, 1 wet), offset is where in the bar it
// starts (beats after the bar line), and bars has one boolean per bar of the
// LOOP_BARS loop: false means the track rests in that bar. loop true means
// the sample repeats until the bar ends (see barPasses) instead of playing
// once at the start of it.

export function createTrack(bufferNumber, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    soundId: null,
    bufferNumber,
    rate: 1,
    attack: 0,
    release: 0,
    amp: AMP.initial,
    cutoff: CUTOFF.initial,
    reverb: REVERB.initial,
    offset: OFFSET.initial,
    muted: false,
    bars: Array(LOOP_BARS).fill(true),
    loop: false,
    ...overrides,
  }
}

export const rateToSemitones = (rate) => 12 * Math.log2(rate)
export const semitonesToRate = (semitones) => 2 ** (semitones / 12)

// The sample players fit attack + release inside the sample's playing time
// (sustain fills what's left). If they don't fit, the sample runs out mid-fade
// and clicks, so scale both down to fit.
export function fitEnvelope({ attack, release }, playSeconds) {
  const total = attack + release
  if (total <= playSeconds) return { attack, release }
  const scale = playSeconds / total
  return { attack: attack * scale, release: release * scale }
}

// A very short sample would need hundreds of passes to fill a slow bar, so
// passes never start closer together than barSeconds / MAX_PASSES.
export const MAX_PASSES = 64
const MIN_PASS_S = 0.02 // a sliver shorter than this at the bar line is dropped

// When a sample plays in one bar: [{ offset, length }], offset in seconds
// from the bar line. length is null for a whole pass, or the seconds left
// before the next bar line when the pass has to be cut short. The first pass
// starts startSeconds into the bar. Without loop the sample plays once and
// may ring into the next bar; with loop it restarts each time it ends and
// stops at the bar line.
export function barPasses(playSeconds, barSeconds, { loop = false, startSeconds = 0 } = {}) {
  if (!loop) return [{ offset: startSeconds, length: null }]
  const step = Math.max(playSeconds, barSeconds / MAX_PASSES)
  const passes = []
  for (let i = 0; startSeconds + i * step < barSeconds; i++) {
    const offset = startSeconds + i * step
    const left = barSeconds - offset
    if (left < MIN_PASS_S) break
    passes.push({ offset, length: left < playSeconds ? left : null })
  }
  return passes
}
