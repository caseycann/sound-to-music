import Meyda from 'meyda'
import { dbToGain, mixToMono } from './process.js'
import { channelsOf } from './waveform.js'

// Measures a processed clip and turns the measurements into a spot on the
// field: audioX (Note +1 to Noise -1) and audioY (Hold +1 to Hit -1).
//
// Raw features:
//   flatness      Meyda spectral flatness, 0 (pure tone) to 1 (white noise).
//   pitchClarity  Peak of the normalized autocorrelation (McLeod's NSDF),
//                 0 (no repeating period) to 1 (perfectly periodic). Meyda
//                 has no pitch extractor, so this runs on the same frames
//                 Meyda measures.
//                 Both are averaged over non-silent frames, weighted by RMS.
//   attackTime    Seconds the RMS envelope takes to rise into its peak (not
//                 from the clip start: a clip with two taps would otherwise
//                 read as a slow attack if the second tap is louder).
//   sustainTime   Seconds the smoothed RMS envelope stays at or above
//                 SUSTAIN_FRACTION of its peak, counting the unbroken run
//                 that contains the peak.

// ---- Tuning: everything that decides where a sound lands is here. ----

// Each axis is a weighted average of per-feature scores. A feature scores +1
// at `plusAt`, -1 at `minusAt`, and in between linearly (or linearly in log
// space when `log` is true, which suits times). Scores and axes are clamped
// to [-1, 1]. plusAt may be above or below minusAt. A feature scores 0
// halfway between (the geometric mean for log terms).
//
// Tuned on real phone/field-recorder clips (scripts/tune-features.mjs).
// Typical values seen:
//                 flatness  pitchClarity  attackTime  sustainTime
//   hum            0.011       0.997        0.17 s      2.4 s
//   glass tap      0.082       0.716        0.006 s     0.13 s
//   breath whoosh  0.039       0.336        0.11 s      0.32 s
//   nail taps      0.089       0.218        0.006 s     0.06 s
// Full-band flatness stays low on real mics (they roll off the highs) and
// doesn't separate a breath from a glass tap, so pitch clarity carries X.
export const MAPPING = {
  x: [ // Note +1 ... Noise -1
    { feature: 'flatness', weight: 0.25, plusAt: 0.01, minusAt: 0.1 },
    { feature: 'pitchClarity', weight: 0.75, plusAt: 0.8, minusAt: 0.3 },
  ],
  y: [ // Hold +1 ... Hit -1
    { feature: 'attackTime', weight: 0.3, plusAt: 0.25, minusAt: 0.02, log: true },
    { feature: 'sustainTime', weight: 0.7, plusAt: 0.6, minusAt: 0.06, log: true },
  ],
}

// Frames for flatness and pitch clarity.
export const ANALYSIS_FRAME = 2048
export const ANALYSIS_HOP = 1024
// A frame this far below the loudest frame counts as silent and is ignored.
export const SILENT_FRAME_DB = -40
// Pitch search range for pitch clarity.
export const MIN_PITCH_HZ = 60
export const MAX_PITCH_HZ = 2000

// Frames for the RMS envelope (attack and sustain). ~12 ms frames, ~6 ms apart.
export const ENVELOPE_FRAME = 512
export const ENVELOPE_HOP = 256
// The attack starts where the envelope was last below this fraction of the peak.
export const ATTACK_START_FRACTION = 0.2
// Sustain is measured on the envelope smoothed over this many seconds (so the
// natural wobble of breath or wind doesn't cut it short), staying at or above
// SUSTAIN_FRACTION of the smoothed peak.
export const SUSTAIN_SMOOTH_S = 0.08
export const SUSTAIN_FRACTION = 0.5

// ---- Measuring ----

// Meyda keeps its settings on a shared object, so set them per call.
function meyda(features, frame, sampleRate) {
  Meyda.bufferSize = frame.length
  Meyda.sampleRate = sampleRate
  return Meyda.extract(features, frame)
}

// Frames of `size` every `hop` samples. The last frame is zero-padded, and a
// clip shorter than one frame still gets one. `time` is the frame's centre.
export function frames(samples, sampleRate, size, hop) {
  const count = Math.max(1, Math.ceil(Math.max(0, samples.length - size) / hop) + 1)
  return Array.from({ length: count }, (_, i) => {
    const start = i * hop
    const frame = new Float32Array(size)
    frame.set(samples.subarray(start, start + size))
    return { frame, time: (start + size / 2) / sampleRate }
  })
}

// Highest normalized-autocorrelation peak for a pitch between MIN_PITCH_HZ
// and MAX_PITCH_HZ, searched only after the curve first dips below zero (so
// the trivial peak near lag 0, and slow rumble, don't count).
export function pitchClarity(frame, sampleRate) {
  const n = frame.length
  const minLag = Math.max(1, Math.floor(sampleRate / MAX_PITCH_HZ))
  const maxLag = Math.min(n - 1, Math.ceil(sampleRate / MIN_PITCH_HZ))

  // energy = sum over i < n - lag of x[i]^2 + x[i + lag]^2, updated per lag.
  let energy = 0
  for (let i = 0; i < n; i++) energy += 2 * frame[i] * frame[i]

  let crossedZero = false
  let best = 0
  for (let lag = 1; lag <= maxLag; lag++) {
    energy -= frame[n - lag] ** 2 + frame[lag - 1] ** 2
    let acf = 0
    for (let i = 0; i < n - lag; i++) acf += frame[i] * frame[i + lag]
    const nsdf = energy > 0 ? (2 * acf) / energy : 0
    if (!crossedZero) crossedZero = nsdf < 0
    else if (lag >= minLag && nsdf > best) best = nsdf
  }
  return best
}

// Centred moving average over `radius` frames each side.
function smooth(values, radius) {
  return values.map((_, i) => {
    const from = Math.max(0, i - radius)
    const to = Math.min(values.length, i + radius + 1)
    let sum = 0
    for (let j = from; j < to; j++) sum += values[j]
    return sum / (to - from)
  })
}

// Index of the largest value.
const argMax = (values) => values.reduce((best, v, i) => (v > values[best] ? i : best), 0)

// Attack and sustain from the RMS envelope.
export function envelopeTimes(samples, sampleRate) {
  const envelope = frames(samples, sampleRate, ENVELOPE_FRAME, ENVELOPE_HOP).map(({ frame }) =>
    meyda('rms', frame, sampleRate),
  )
  const frameS = ENVELOPE_HOP / sampleRate

  // Attack: rise time into the loudest moment, from the last frame before it
  // that was below ATTACK_START_FRACTION of the peak (or from the start).
  const peak = argMax(envelope)
  let riseStart = peak
  while (riseStart > 0 && envelope[riseStart - 1] >= envelope[peak] * ATTACK_START_FRACTION) riseStart--
  const attackTime = (peak - riseStart + 1) * frameS

  // Sustain: unbroken run around the peak of the smoothed envelope that stays
  // at or above SUSTAIN_FRACTION of that peak.
  const smoothed = smooth(envelope, Math.round(SUSTAIN_SMOOTH_S / 2 / frameS))
  const top = argMax(smoothed)
  const floor = smoothed[top] * SUSTAIN_FRACTION
  let first = top
  while (first > 0 && smoothed[first - 1] >= floor) first--
  let last = top
  while (last < smoothed.length - 1 && smoothed[last + 1] >= floor) last++

  return { attackTime, sustainTime: (last - first + 1) * frameS }
}

// Flatness and pitch clarity over the non-silent analysis frames, each frame
// weighted by its RMS so the sound itself outweighs quiet room noise.
export function spectralFeatures(samples, sampleRate) {
  const measured = frames(samples, sampleRate, ANALYSIS_FRAME, ANALYSIS_HOP).map(({ frame }) => ({
    frame,
    ...meyda(['rms', 'spectralFlatness'], frame, sampleRate),
  }))
  const loudest = Math.max(...measured.map((f) => f.rms))
  const voiced = measured.filter(
    (f) => f.rms > 0 && f.rms >= loudest * dbToGain(SILENT_FRAME_DB) && Number.isFinite(f.spectralFlatness),
  )

  const totalWeight = voiced.reduce((sum, f) => sum + f.rms, 0)
  const weightedMean = (valueOf) => (totalWeight ? voiced.reduce((sum, f) => sum + f.rms * valueOf(f), 0) / totalWeight : 0)
  return {
    flatness: weightedMean((f) => f.spectralFlatness),
    pitchClarity: weightedMean((f) => pitchClarity(f.frame, sampleRate)),
    voicedFrames: voiced.length,
    totalFrames: measured.length,
  }
}

export function measureFeatures(samples, sampleRate) {
  return { ...spectralFeatures(samples, sampleRate), ...envelopeTimes(samples, sampleRate) }
}

// ---- Mapping ----

const clamp = (v) => Math.min(1, Math.max(-1, v))
const safeLog = (v) => Math.log(Math.max(v, 1e-6))

export function scoreTerm(value, { plusAt, minusAt, log = false }) {
  const f = log ? safeLog : (v) => v
  const t = (f(value) - f(minusAt)) / (f(plusAt) - f(minusAt))
  return clamp(2 * t - 1)
}

function axis(terms, features) {
  const scored = terms.map((term) => ({ ...term, value: features[term.feature], score: scoreTerm(features[term.feature], term) }))
  const totalWeight = scored.reduce((sum, t) => sum + t.weight, 0)
  const value = totalWeight ? scored.reduce((sum, t) => sum + t.weight * t.score, 0) / totalWeight : 0
  return { value: clamp(value), terms: scored }
}

// features -> { audioX, audioY, terms: { x, y } }, where terms lists each
// feature's value, score and weight (for the debug panel).
export function mapToField(features, mapping = MAPPING) {
  const x = axis(mapping.x, features)
  const y = axis(mapping.y, features)
  return { audioX: x.value, audioY: y.value, terms: { x: x.terms, y: y.terms } }
}

// ---- Entry points ----

// samples: mono Float32Array. Returns { features, audioX, audioY, terms }.
export function analyzeSamples(samples, sampleRate) {
  const features = measureFeatures(samples, sampleRate)
  return { features, ...mapToField(features) }
}

// audio: the processed AudioBuffer (mixed to mono if it isn't already).
export function analyzeBuffer(audio) {
  return analyzeSamples(mixToMono(channelsOf(audio)), audio.sampleRate)
}
