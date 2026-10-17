import { describe, expect, it } from 'vitest'
import {
  MAX_SELECTION_S, MIN_SELECTION_S, computePeaks, loudestWindow, moveSelection, peakLevel,
  resizeSelection, viewAround,
} from './waveform.js'

const RATE = 1000

describe('loudestWindow', () => {
  it('returns the whole file when it is short', () => {
    expect(loudestWindow([new Float32Array(2 * RATE)], RATE)).toEqual({ start: 0, end: 2 })
  })
  it('finds the loud part of a long file', () => {
    const data = new Float32Array(20 * RATE)
    data.fill(0.8, 12 * RATE, 14 * RATE) // loud from 12 s to 14 s
    const { start, end } = loudestWindow([data], RATE)
    expect(end - start).toBe(MAX_SELECTION_S)
    expect(start).toBeLessThanOrEqual(12)
    expect(end).toBeGreaterThanOrEqual(14)
  })
  it('never runs past the end', () => {
    const data = new Float32Array(10 * RATE)
    data.fill(1, 9.5 * RATE)
    expect(loudestWindow([data], RATE).end).toBeLessThanOrEqual(10)
  })
})

describe('computePeaks', () => {
  it('gives min and max per column across channels', () => {
    const peaks = computePeaks([Float32Array.from([0.5, -0.2, 0, 0]), Float32Array.from([0, 0, -0.9, 0.1])], 0, 4, 2)
    expect([...peaks].map((v) => +v.toFixed(2))).toEqual([-0.2, 0.5, -0.9, 0.1])
  })
})

describe('peakLevel', () => {
  it('finds the loudest sample', () => {
    expect(peakLevel([Float32Array.from([0.1, -0.7]), Float32Array.from([0.5])])).toBeCloseTo(0.7)
  })
})

describe('moveSelection', () => {
  it('keeps the length and stays inside the file', () => {
    expect(moveSelection({ start: 1, end: 3 }, 10, 5)).toEqual({ start: 3, end: 5 })
    expect(moveSelection({ start: 1, end: 3 }, -10, 5)).toEqual({ start: 0, end: 2 })
  })
})

describe('resizeSelection', () => {
  it('caps the length at the maximum', () => {
    expect(resizeSelection({ start: 2, end: 3 }, 'end', 9, 10)).toEqual({ start: 2, end: 2 + MAX_SELECTION_S })
    expect(resizeSelection({ start: 5, end: 6 }, 'start', 0, 10)).toEqual({ start: 6 - MAX_SELECTION_S, end: 6 })
  })
  it('keeps at least the minimum length', () => {
    expect(resizeSelection({ start: 2, end: 3 }, 'start', 5, 10).start).toBeCloseTo(3 - MIN_SELECTION_S)
  })
  it('stays inside the file', () => {
    expect(resizeSelection({ start: 0.5, end: 1 }, 'start', -1, 10).start).toBe(0)
    expect(resizeSelection({ start: 9, end: 9.5 }, 'end', 12, 10).end).toBe(10)
  })
})

describe('viewAround', () => {
  it('pads the selection but stays inside the file', () => {
    expect(viewAround({ start: 1, end: 3 }, 1.5, 4)).toEqual({ start: 0, end: 4 })
  })
})
