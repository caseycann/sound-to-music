import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBarClock } from './barClock.js'

describe('createBarClock', () => {
  let t
  let bars
  let clock

  beforeEach(() => {
    vi.useFakeTimers()
    t = 0
    bars = []
    clock = createBarClock({ now: () => t, getBarSeconds: () => 2, onBar: (time, index) => bars.push([time, index]) })
  })
  afterEach(() => {
    clock.stop()
    vi.useRealTimers()
  })

  const advance = (seconds) => {
    t += seconds
    vi.advanceTimersByTime(25)
  }

  it('numbers bars from 0 at start', () => {
    clock.start()
    advance(2)
    advance(2)
    expect(bars.map(([, i]) => i)).toEqual([0, 1, 2])
    expect(bars[1][0]).toBeCloseTo(2.05)
  })

  it('counts skipped bars so the loop stays in step', () => {
    clock.start()
    advance(7) // bars at 2.05 and 4.05 are late; 6.05 is skipped too, 8.05 is next
    t = 7.95
    vi.advanceTimersByTime(25)
    expect(bars.map(([, i]) => i)).toEqual([0, 4])
  })

  it('starts again from 0', () => {
    clock.start()
    advance(2)
    clock.stop()
    clock.start()
    expect(bars.at(-1)[1]).toBe(0)
  })
})
