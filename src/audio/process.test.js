import { describe, expect, it } from 'vitest'
import {
  FADE_S, PEAK_DBFS, SilentClipError, applyFades, dbToGain, findSoundBounds, finishClip,
  mixToMono, normalizePeak, sliceMono,
} from './process.js'

const RATE = 44100
const f32 = (values) => Float32Array.from(values)

describe('mixToMono', () => {
  it('averages the channels', () => {
    expect([...mixToMono([f32([1, 0.5]), f32([0, -0.5])])]).toEqual([0.5, 0])
  })
  it('passes a mono channel through', () => {
    expect([...mixToMono([f32([0.25, -0.25])])]).toEqual([0.25, -0.25])
  })
})

describe('findSoundBounds', () => {
  it('finds the first and last loud samples', () => {
    expect(findSoundBounds(f32([0, 0.001, 0.5, 0, 0.2, 0]), 0.01)).toEqual({ start: 2, end: 5 })
  })
  it('returns null when everything is quiet', () => {
    expect(findSoundBounds(f32([0, 0.001, -0.001]), 0.01)).toBeNull()
  })
})

describe('applyFades', () => {
  it('ramps both ends and leaves the input alone', () => {
    const input = new Float32Array(10).fill(1)
    const out = applyFades(input, 4)
    expect([...out]).toEqual([0, 0.25, 0.5, 0.75, 1, 1, 0.75, 0.5, 0.25, 0])
    expect(input[0]).toBe(1)
  })
  it('shortens fades on tiny clips', () => {
    expect([...applyFades(f32([1, 1, 1]), 10)]).toEqual([0, 1, 0])
  })
})

describe('normalizePeak', () => {
  it('puts the loudest sample at the target level', () => {
    const out = normalizePeak(f32([0.1, -0.2, 0.05]), -1)
    expect(Math.abs(out[1])).toBeCloseTo(dbToGain(-1), 5)
    expect(out[0]).toBeCloseTo(dbToGain(-1) / 2, 5)
  })
})

describe('finishClip', () => {
  it('trims silence, keeping one fade length around the sound, and normalizes', () => {
    const samples = new Float32Array(RATE) // 1 s of silence
    samples.fill(0.3, 20000, 24000) // with 4000 frames of sound in the middle
    const fade = Math.round(FADE_S * RATE)
    const out = finishClip(samples, RATE)

    expect(out.length).toBe(4000 + 2 * fade)
    expect(out[0]).toBe(0)
    expect(out[out.length - 1]).toBe(0)
    expect(Math.max(...out)).toBeCloseTo(dbToGain(PEAK_DBFS), 5)
  })
  it('keeps the attack when the sound starts at the very beginning', () => {
    const samples = new Float32Array(1000).fill(0.5)
    expect(finishClip(samples, RATE).length).toBe(1000)
  })
  it('rejects a silent clip', () => {
    expect(() => finishClip(new Float32Array(RATE).fill(0.001), RATE)).toThrow(SilentClipError)
  })
})

describe('sliceMono', () => {
  it('cuts the selection and mixes it', () => {
    const left = f32([0, 1, 1, 0])
    const right = f32([0, 0, 1, 0])
    expect([...sliceMono([left, right], 4, 0.25, 0.75)]).toEqual([0.5, 1])
  })
})
