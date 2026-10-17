import { describe, expect, it } from 'vitest'
import { createTrackGroups } from './trackGroups.js'

describe('createTrackGroups', () => {
  it('gives each track its own group and stereo bus, and keeps them', () => {
    const groups = createTrackGroups()
    expect(groups.claim('a')).toEqual({ group: 101, bus: 16, fresh: true })
    expect(groups.claim('b')).toEqual({ group: 102, bus: 18, fresh: true })
    expect(groups.claim('a')).toEqual({ group: 101, bus: 16, fresh: false })
  })

  it('does not hand a released group number straight back, but reuses its bus', () => {
    const groups = createTrackGroups()
    groups.claim('a')
    groups.release('a')
    expect(groups.get('a')).toBeUndefined()
    expect(groups.claim('b')).toEqual({ group: 102, bus: 16, fresh: true })
  })

  it('wraps group numbers after 999', () => {
    const groups = createTrackGroups()
    for (let i = 101; i <= 999; i++) {
      groups.claim(`t${i}`)
      groups.release(`t${i}`)
    }
    expect(groups.claim('next').group).toBe(101)
  })

  it('forgets everything on clear', () => {
    const groups = createTrackGroups()
    groups.claim('a')
    groups.clear()
    expect(groups.claim('a').fresh).toBe(true)
  })
})
