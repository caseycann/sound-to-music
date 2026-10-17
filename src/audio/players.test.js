import { describe, expect, it } from 'vitest'
import { liveControls, playSeconds, reverbPacket, trackPacket } from './players.js'
import { createTrack } from './tracks.js'

const MONO = { numChannels: 1, duration: 1 }
const SLOT = { group: 105, bus: 18 }
const args = (packet) => Object.fromEntries(packet.slice(5).flatMap((v, i, a) => (i % 2 ? [] : [[v, a[i + 1]]])))

describe('trackPacket', () => {
  it('plays the whole sample with no sustain', () => {
    const packet = trackPacket(createTrack(16, { attack: 0.1, cutoff: 90 }), MONO, SLOT)
    expect(packet.slice(0, 5)).toEqual(['/s_new', 'sonic-pi-basic_mono_player', -1, 0, 105])
    expect(args(packet)).toMatchObject({ buf: 16, out_bus: 18, attack: 0.1, release: 0, lpf: 90 })
    expect(args(packet)).not.toHaveProperty('sustain')
  })

  it('ends a cut pass on time, with a short fade', () => {
    const a = args(trackPacket(createTrack(16, { attack: 0.1 }), MONO, SLOT, 0.5))
    expect(a.release).toBe(0.01)
    expect(a.attack + a.sustain + a.release).toBeCloseTo(0.5)
  })

  it('shrinks the envelope to fit a very short cut', () => {
    const a = args(trackPacket(createTrack(16, { attack: 0.3, release: 0.3 }), MONO, SLOT, 0.2))
    expect(a.attack + a.release).toBeCloseTo(0.2)
    expect(a.sustain).toBeCloseTo(0)
  })

  it('returns null for a sample it can’t play', () => {
    expect(trackPacket(createTrack(16), { numChannels: 6, duration: 1 }, SLOT)).toBeNull()
    expect(playSeconds(createTrack(16, { rate: 2 }), MONO)).toBe(0.5)
  })
})

describe('reverbPacket', () => {
  it('adds the reverb at the tail of the group, from the track bus to the speakers', () => {
    const packet = reverbPacket(createTrack(16, { reverb: 0.4 }), SLOT)
    expect(packet.slice(0, 5)).toEqual(['/s_new', 'sonic-pi-fx_reverb', -1, 1, 105])
    expect(args(packet)).toMatchObject({ in_bus: 18, out_bus: 0, mix: 0.4 })
  })
})

describe('liveControls', () => {
  it('glides cutoff and reverb', () => {
    expect(liveControls(createTrack(16, { cutoff: 70, reverb: 0.5 }))).toEqual([
      'lpf_slide', 0.05, 'lpf', 70, 'mix_slide', 0.05, 'mix', 0.5,
    ])
  })
})
