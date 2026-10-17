import { describe, expect, it } from 'vitest'
import { quadrantOf } from './quadrants.js'

describe('quadrantOf', () => {
  it('names each quadrant', () => {
    expect(quadrantOf(0.8, -0.9)).toBe('Plinks')
    expect(quadrantOf(0.4, 0.9)).toBe('Hums')
    expect(quadrantOf(-0.7, -0.9)).toBe('Clicks')
    expect(quadrantOf(-0.9, 0.9)).toBe('Whooshes')
  })

  it('puts points on an axis on the Note / Hold side', () => {
    expect(quadrantOf(0, 0)).toBe('Hums')
  })
})
