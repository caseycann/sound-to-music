import { describe, expect, it } from 'vitest'
import { DRIFT_PX, JITTER, dotLabel, dotLayout, inTabOrder, randomFrom, resizeTransform, seedFrom } from './dotField.js'

const sound = (id, finalX, finalY) => ({ id, finalX, finalY, onomatopoeia: 'bzzt', descriptors: ['buzzy', 'bright'] })

describe('seeded randomness', () => {
  it('gives the same numbers for the same id', () => {
    const a = randomFrom('recA')
    const b = randomFrom('recA')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('gives different seeds for different ids', () => {
    expect(seedFrom('recA')).not.toBe(seedFrom('recB'))
  })
})

describe('dotLayout', () => {
  it('is the same every time for one sound', () => {
    expect(dotLayout(sound('rec1', 0.3, -0.4))).toEqual(dotLayout(sound('rec1', 0.3, -0.4)))
  })

  it('keeps jitter small and inside the quadrant', () => {
    for (let i = 0; i < 500; i++) {
      for (const [fx, fy] of [[0, 0], [-0.01, 0.01], [1, -1], [-1, 1], [0.5, 0.5]]) {
        const { x, y, quadrant } = dotLayout(sound(`rec${i}`, fx, fy))
        expect(Math.abs(x - fx)).toBeLessThanOrEqual(JITTER + 1e-9)
        expect(Math.abs(y - fy)).toBeLessThanOrEqual(JITTER + 1e-9)
        expect(Math.sign(x || 1)).toBe(Math.sign(fx || 1))
        expect(Math.sign(y || 1)).toBe(Math.sign(fy || 1))
        expect(Math.abs(x)).toBeLessThanOrEqual(1)
        expect(quadrant).toBeTruthy()
      }
    }
  })

  it('never drifts more than DRIFT_PX', () => {
    for (let i = 0; i < 500; i++) {
      const { drift } = dotLayout(sound(`rec${i}`, 0, 0))
      expect(Math.hypot(drift.dx, drift.dy)).toBeLessThanOrEqual(DRIFT_PX + 1e-9)
      expect(drift.delay).toBeLessThanOrEqual(0)
      expect(-drift.delay).toBeLessThan(drift.duration)
    }
  })

  it('uses the quadrant from the server when given', () => {
    expect(dotLayout({ ...sound('r', 0.5, 0.5), quadrant: 'Hums' }).quadrant).toBe('Hums')
    expect(dotLayout(sound('r', -0.5, -0.5)).quadrant).toBe('Clicks')
  })
})

describe('inTabOrder', () => {
  it('goes top row first, then left to right', () => {
    const dots = [
      { sound: { id: 'c' }, x: 0.5, y: -0.5 },
      { sound: { id: 'b' }, x: 0.5, y: 0.5 },
      { sound: { id: 'a' }, x: -0.5, y: 0.5 },
    ]
    expect(inTabOrder(dots).map((d) => d.sound.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('resizeTransform', () => {
  const screen = (t, p) => t.k * p + t.x

  it('keeps the identity view', () => {
    expect(resizeTransform({ k: 1, x: 0, y: 0 }, 500, 700, 28)).toEqual({ k: 1, x: 0, y: 0 })
  })

  it('keeps the same field point at the same relative spot', () => {
    const t = { k: 3, x: -400, y: -250 }
    const pad = 28
    const from = 500
    const to = 640
    const r = (to - 2 * pad) / (from - 2 * pad)
    const next = resizeTransform(t, from, to, pad)
    const p = 200
    const pNew = pad + (p - pad) * r
    expect(screen(next, pNew)).toBeCloseTo(pad + (screen(t, p) - pad) * r)
  })
})

describe('dotLabel', () => {
  it('lists the words and marks used sounds', () => {
    expect(dotLabel(sound('r', 0, 0), false)).toBe('bzzt: buzzy, bright')
    expect(dotLabel(sound('r', 0, 0), true)).toBe('bzzt: buzzy, bright (used)')
  })
})
