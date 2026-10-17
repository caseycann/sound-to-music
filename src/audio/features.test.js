import { describe, expect, it } from 'vitest'
import { quadrantOf } from '../field/quadrants.js'
import { analyzeSamples, envelopeTimes, frames, mapToField, pitchClarity, scoreTerm } from './features.js'

const RATE = 44100

// Deterministic noise so the tests don't flake.
function noise(length, seed = 1) {
  let s = seed
  return Float32Array.from({ length }, () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 31 - 1
  })
}

const sine = (length, hz) => Float32Array.from({ length }, (_, i) => Math.sin((2 * Math.PI * hz * i) / RATE))

// Multiply by an envelope: instant start, exponential decay with time constant `tau` seconds.
const decay = (samples, tau) => samples.map((s, i) => s * Math.exp(-i / RATE / tau))

describe('frames', () => {
  it('always gives at least one zero-padded frame', () => {
    const out = frames(new Float32Array(10).fill(1), RATE, 16, 8)
    expect(out).toHaveLength(1)
    expect(out[0].frame[9]).toBe(1)
    expect(out[0].frame[10]).toBe(0)
  })
})

describe('pitchClarity', () => {
  it('is near 1 for a sine and low for noise', () => {
    expect(pitchClarity(sine(2048, 440), RATE)).toBeGreaterThan(0.95)
    expect(pitchClarity(noise(2048), RATE)).toBeLessThan(0.3)
  })
})

describe('envelopeTimes', () => {
  it('finds a quick attack and short sustain on a hit', () => {
    const { attackTime, sustainTime } = envelopeTimes(decay(noise(RATE), 0.02), RATE)
    expect(attackTime).toBeLessThan(0.02)
    expect(sustainTime).toBeLessThan(0.05)
  })
  it('finds a long sustain on a held tone', () => {
    expect(envelopeTimes(sine(RATE * 2, 220), RATE).sustainTime).toBeGreaterThan(1.9)
  })
})

describe('scoreTerm', () => {
  it('maps minusAt to -1, plusAt to +1 and clamps', () => {
    const term = { plusAt: 0.1, minusAt: 0.5 }
    expect(scoreTerm(0.1, term)).toBeCloseTo(1)
    expect(scoreTerm(0.5, term)).toBeCloseTo(-1)
    expect(scoreTerm(0.3, term)).toBeCloseTo(0)
    expect(scoreTerm(5, term)).toBe(-1)
  })
  it('works in log space', () => {
    expect(scoreTerm(0.1, { plusAt: 1, minusAt: 0.01, log: true })).toBeCloseTo(0)
  })
})

describe('mapToField', () => {
  it('clamps both axes', () => {
    const { audioX, audioY } = mapToField({ flatness: 0, pitchClarity: 1, attackTime: 10, sustainTime: 10 })
    expect(audioX).toBe(1)
    expect(audioY).toBe(1)
  })
})

describe('analyzeSamples puts test sounds in the right quadrant', () => {
  const quadrant = (samples) => {
    const { audioX, audioY } = analyzeSamples(samples, RATE)
    return quadrantOf(audioX, audioY)
  }
  it('held sine -> Hums', () => expect(quadrant(sine(RATE * 2, 330))).toBe('Hums'))
  it('plucked sine -> Plinks', () => expect(quadrant(decay(sine(RATE, 660), 0.03))).toBe('Plinks'))
  it('held noise -> Whooshes', () => expect(quadrant(noise(RATE * 2))).toBe('Whooshes'))
  it('noise burst -> Clicks', () => expect(quadrant(decay(noise(RATE), 0.01))).toBe('Clicks'))
})
