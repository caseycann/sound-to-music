import { describe, expect, it } from 'vitest'
import { isDeliveryUrlFor, signParams } from './cloudinary.js'

describe('signParams', () => {
  it('matches the example in Cloudinary’s signature docs', () => {
    const params = { eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 }
    expect(signParams(params, 'abcd')).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e')
  })
})

describe('isDeliveryUrlFor', () => {
  const base = 'https://res.cloudinary.com/demo/video/upload'

  it('accepts the URL for that public ID, with or without a version', () => {
    expect(isDeliveryUrlFor(`${base}/v1712/found-sound/abc.wav`, 'demo', 'found-sound/abc')).toBe(true)
    expect(isDeliveryUrlFor(`${base}/found-sound/abc.wav`, 'demo', 'found-sound/abc')).toBe(true)
  })

  it('rejects other clouds, resource types, IDs and hosts', () => {
    expect(isDeliveryUrlFor(`${base}/v1/found-sound/abc.wav`, 'other', 'found-sound/abc')).toBe(false)
    expect(isDeliveryUrlFor(`${base}/v1/found-sound/xyz.wav`, 'demo', 'found-sound/abc')).toBe(false)
    expect(isDeliveryUrlFor('https://res.cloudinary.com/demo/image/upload/v1/found-sound/abc.wav', 'demo', 'found-sound/abc')).toBe(false)
    expect(isDeliveryUrlFor('http://res.cloudinary.com/demo/video/upload/v1/found-sound/abc.wav', 'demo', 'found-sound/abc')).toBe(false)
    expect(isDeliveryUrlFor(undefined, 'demo', 'found-sound/abc')).toBe(false)
  })
})
