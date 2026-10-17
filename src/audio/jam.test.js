import { describe, expect, it } from 'vitest'
import { MAX_TRACKS, initialJam, jamReducer, toRecipe } from './jam.js'
import { createTrack } from './tracks.js'

const add = (jam, soundId, bufferNumber = 16) =>
  jamReducer(jam, { type: 'addTrack', track: createTrack(bufferNumber, { soundId }) })

describe('jamReducer', () => {
  it('adds a track and marks its sound used', () => {
    const jam = add(initialJam, 'recA')
    expect(jam.tracks).toHaveLength(1)
    expect(jam.tracks[0].soundId).toBe('recA')
    expect(jam.usedIds).toEqual(['recA'])
  })

  it('refuses a sound that was already used', () => {
    const jam = add(add(initialJam, 'recA'), 'recA')
    expect(jam.tracks).toHaveLength(1)
  })

  it(`caps the jam at ${MAX_TRACKS} tracks`, () => {
    let jam = initialJam
    for (let i = 0; i < MAX_TRACKS + 2; i++) jam = add(jam, `rec${i}`)
    expect(jam.tracks).toHaveLength(MAX_TRACKS)
    expect(jam.usedIds).toHaveLength(MAX_TRACKS)
  })

  it('keeps a removed track’s sound used', () => {
    let jam = add(initialJam, 'recA')
    jam = jamReducer(jam, { type: 'removeTrack', id: jam.tracks[0].id })
    expect(jam.tracks).toEqual([])
    expect(jam.usedIds).toEqual(['recA'])
    expect(add(jam, 'recA').tracks).toEqual([])
  })

  it('adds the test sound without marking anything used', () => {
    const jam = jamReducer(initialJam, { type: 'addTrack', track: createTrack(0) })
    expect(jam.tracks).toHaveLength(1)
    expect(jam.usedIds).toEqual([])
  })

  it('clamps track settings and ignores unknown keys', () => {
    let jam = add(initialJam, 'recA')
    const { id, bufferNumber } = jam.tracks[0]
    jam = jamReducer(jam, {
      type: 'updateTrack',
      id,
      patch: { rate: 10, attack: -1, release: 0.5, amp: 2, cutoff: 10, reverb: 3, muted: 1, loop: 'on', bufferNumber: 99, id: 'x' },
    })
    expect(jam.tracks[0]).toMatchObject({ id, bufferNumber, rate: 4, attack: 0, release: 0.5, amp: 1, cutoff: 40, reverb: 1, muted: true, loop: true })
  })

  it('sets which bars of the loop a track plays', () => {
    let jam = add(initialJam, 'recA')
    const { id } = jam.tracks[0]
    expect(jam.tracks[0].bars).toEqual([true, true, true, true])
    jam = jamReducer(jam, { type: 'updateTrack', id, patch: { bars: [true, 0, false, 'yes'] } })
    expect(jam.tracks[0].bars).toEqual([true, false, false, true])
    jam = jamReducer(jam, { type: 'updateTrack', id, patch: { bars: [false] } }) // wrong length: ignored
    expect(jam.tracks[0].bars).toEqual([true, false, false, true])
  })

  it('snaps the start offset to quarter beats inside the bar', () => {
    let jam = add(initialJam, 'recA')
    const { id } = jam.tracks[0]
    const offsetAfter = (offset) => jamReducer(jam, { type: 'updateTrack', id, patch: { offset } }).tracks[0].offset
    expect(offsetAfter(1.3)).toBe(1.25)
    expect(offsetAfter(9)).toBe(3.75)
    expect(offsetAfter(-1)).toBe(0)
    expect(offsetAfter(NaN)).toBe(0)
  })

  it('clamps and rounds the BPM', () => {
    expect(jamReducer(initialJam, { type: 'setBpm', bpm: 500 }).bpm).toBe(180)
    expect(jamReducer(initialJam, { type: 'setBpm', bpm: 99.6 }).bpm).toBe(100)
    expect(jamReducer(initialJam, { type: 'setBpm', bpm: NaN }).bpm).toBe(initialJam.bpm)
  })
})

describe('toRecipe', () => {
  it('keeps the settings and drops session-only ids', () => {
    let jam = add(initialJam, 'recA', 20)
    jam = jamReducer(jam, { type: 'setBpm', bpm: 90 })
    expect(toRecipe(jam)).toEqual({
      bpm: 90,
      tracks: [{ soundId: 'recA', rate: 1, attack: 0, release: 0, amp: 0.6, cutoff: 130, reverb: 0, offset: 0, muted: false, bars: [true, true, true, true], loop: false }],
    })
  })
})
