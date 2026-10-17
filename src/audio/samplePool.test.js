import { describe, expect, it } from 'vitest'
import { createSamplePool } from './samplePool.js'

describe('createSamplePool', () => {
  it('gives each new key a free slot, and the same slot after that', () => {
    const pool = createSamplePool({ first: 10, size: 2 })
    expect(pool.claim('a')).toEqual({ bufferNumber: 10, fresh: true })
    expect(pool.claim('b')).toEqual({ bufferNumber: 11, fresh: true })
    expect(pool.claim('a')).toEqual({ bufferNumber: 10, fresh: false })
  })

  it('evicts the least recently used key when full', () => {
    const pool = createSamplePool({ first: 10, size: 2 })
    pool.claim('a')
    pool.claim('b')
    pool.claim('a') // b is now the oldest
    expect(pool.claim('c')).toEqual({ bufferNumber: 11, fresh: true })
    expect(pool.claim('b')).toEqual({ bufferNumber: 10, fresh: true }) // a was evicted
  })

  it('never evicts a busy buffer, and throws when every slot is busy', () => {
    const pool = createSamplePool({ first: 10, size: 2 })
    pool.claim('a')
    pool.claim('b')
    expect(pool.claim('c', new Set([10]))).toEqual({ bufferNumber: 11, fresh: true })
    expect(() => pool.claim('d', new Set([10, 11]))).toThrow(/Too many sounds/)
  })

  it('frees a released slot', () => {
    const pool = createSamplePool({ first: 10, size: 1 })
    pool.claim('a')
    pool.release('a')
    expect(pool.claim('b', new Set([10]))).toEqual({ bufferNumber: 10, fresh: true })
  })
})
