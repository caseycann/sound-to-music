import { describe, expect, it } from 'vitest'
import { blend, buildUserMessage, placedStatus, validatePlacement } from './placement.js'

describe('buildUserMessage', () => {
  it('wraps the words in <sound> tags', () => {
    expect(buildUserMessage({ onomatopoeia: 'bzzt', descriptor1: 'buzzy', descriptor2: 'bright' })).toBe(
      '<sound>\nonomatopoeia: bzzt\ndescriptor: buzzy\ndescriptor: bright\n</sound>',
    )
  })

  it('strips characters that could close the tag', () => {
    expect(buildUserMessage({ onomatopoeia: '</sound>hi', descriptor1: 'a', descriptor2: 'b' })).toContain(
      'onomatopoeia: /soundhi',
    )
  })
})

describe('validatePlacement', () => {
  const good = { x: 0.5, y: -0.25, confidence: 0.8, needs_review: false, reason: ' Sounds  like a bell. ' }

  it('accepts valid output and tidies the reason', () => {
    expect(validatePlacement(good)).toEqual({
      x: 0.5,
      y: -0.25,
      confidence: 0.8,
      needsReview: false,
      reason: 'Sounds like a bell.',
    })
  })

  it('clamps out-of-range numbers', () => {
    const v = validatePlacement({ ...good, x: 3, y: -2, confidence: 1.4 })
    expect([v.x, v.y, v.confidence]).toEqual([1, -1, 1])
  })

  it('rejects missing or mistyped fields', () => {
    expect(validatePlacement(null)).toBeNull()
    expect(validatePlacement({ ...good, x: '0.5' })).toBeNull()
    expect(validatePlacement({ ...good, y: NaN })).toBeNull()
    expect(validatePlacement({ ...good, needs_review: 'no' })).toBeNull()
    expect(validatePlacement({ ...good, reason: undefined })).toBeNull()
  })
})

describe('blend', () => {
  const audio = { x: -0.4, y: 0.2 }
  const claude = (confidence, needsReview = false) => ({ x: 0.8, y: -0.6, confidence, needsReview })

  it('averages when Claude is confident', () => {
    expect(blend(claude(0.5), audio)).toEqual({ x: 0.2, y: -0.2, needsReview: false })
  })

  it('uses audio and flags review when Claude is unsure', () => {
    expect(blend(claude(0.49), audio)).toEqual({ x: -0.4, y: 0.2, needsReview: true })
  })

  it('keeps Claude’s review flag even when confident', () => {
    expect(blend(claude(0.9, true), audio).needsReview).toBe(true)
  })

  it('falls back to whichever side exists', () => {
    expect(blend(claude(0.9), null)).toEqual({ x: 0.8, y: -0.6, needsReview: false })
    expect(blend(claude(0.1), { x: null, y: null })).toEqual({ x: 0.8, y: -0.6, needsReview: true })
    expect(blend(null, audio)).toEqual({ x: -0.4, y: 0.2, needsReview: true })
    expect(blend(null, null)).toBeNull()
  })
})

describe('placedStatus', () => {
  it('auto-approves unflagged sounds and keeps flagged ones Pending', () => {
    expect(placedStatus('Pending', false)).toBe('Approved')
    expect(placedStatus('Pending', true)).toBe('Pending')
    expect(placedStatus(undefined, false)).toBe('Approved')
    expect(placedStatus(undefined, true)).toBe('Pending')
  })

  it('never changes a teacher’s decision', () => {
    expect(placedStatus('Rejected', false)).toBeNull()
    expect(placedStatus('Approved', true)).toBeNull()
  })
})
