// Track model: one looping layer in the jam.
//   { id, bufferNumber, rate, attack, release, amp, muted }
// rate is a playback rate (1 = original pitch, 2 = an octave up), attack and
// release are seconds, amp is linear gain.

export function createTrack(bufferNumber, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    bufferNumber,
    rate: 1,
    attack: 0,
    release: 0,
    amp: 1,
    muted: false,
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
