import { describe, expect, it } from 'vitest'
import { toCoordinate } from './position.js'

describe('toCoordinate', () => {
  it('rounds to two decimals', () => {
    expect(toCoordinate(0.4567)).toBe(0.46)
    expect(toCoordinate(-0.123)).toBe(-0.12)
    expect(toCoordinate('0.5')).toBe(0.5)
  })

  it('clamps to [-1, 1]', () => {
    expect(toCoordinate(3)).toBe(1)
    expect(toCoordinate(-1.2)).toBe(-1)
  })

  it('never returns -0', () => {
    expect(Object.is(toCoordinate(-0.001), 0)).toBe(true)
  })

  it('returns null for anything that is not a number', () => {
    for (const v of [null, undefined, '', 'abc', NaN, Infinity]) expect(toCoordinate(v)).toBeNull()
  })
})
