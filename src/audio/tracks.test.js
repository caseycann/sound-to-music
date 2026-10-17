import { describe, expect, it } from 'vitest'
import { MAX_PASSES, barPasses } from './tracks.js'

describe('barPasses', () => {
  it('plays once at the bar line without loop, even if it rings past the bar', () => {
    expect(barPasses(0.5, 2)).toEqual([{ offset: 0, length: null }])
    expect(barPasses(3, 2, { loop: false })).toEqual([{ offset: 0, length: null }])
  })

  it('repeats back to back and cuts the last pass at the bar line', () => {
    expect(barPasses(0.75, 2, { loop: true })).toEqual([
      { offset: 0, length: null },
      { offset: 0.75, length: null },
      { offset: 1.5, length: 0.5 },
    ])
  })

  it('fills the bar exactly when the sample divides it', () => {
    expect(barPasses(0.5, 2, { loop: true })).toEqual([0, 0.5, 1, 1.5].map((offset) => ({ offset, length: null })))
  })

  it('cuts a sample longer than the bar at the bar line', () => {
    expect(barPasses(3, 2, { loop: true })).toEqual([{ offset: 0, length: 2 }])
  })

  it('drops a sliver at the bar line', () => {
    expect(barPasses(0.995, 2, { loop: true })).toEqual([
      { offset: 0, length: null },
      { offset: 0.995, length: null },
    ])
  })

  it(`never starts more than ${MAX_PASSES} passes in a bar`, () => {
    const passes = barPasses(0.01, 4, { loop: true })
    expect(passes).toHaveLength(MAX_PASSES)
    expect(passes[1].offset).toBeCloseTo(4 / MAX_PASSES)
  })

  it('starts late without loop, and may still ring into the next bar', () => {
    expect(barPasses(1.5, 2, { startSeconds: 1 })).toEqual([{ offset: 1, length: null }])
  })

  it('fills the bar from the start offset with loop', () => {
    expect(barPasses(0.4, 2, { loop: true, startSeconds: 1 })).toEqual([
      { offset: 1, length: null },
      { offset: 1.4, length: null },
      { offset: 1.8, length: expect.closeTo(0.2) },
    ])
    expect(barPasses(3, 2, { loop: true, startSeconds: 1.5 })).toEqual([{ offset: 1.5, length: 0.5 }])
  })
})
