import { quadrantOf } from '../../shared/quadrants.js'

// Pure layout rules for DotField: where each dot sits, how it drifts, and the
// order Tab visits them. Everything is seeded from the sound's id, so a dot
// lands in the same spot and drifts the same way in every session.

export const JITTER = 0.02 // field units each way: separates dots on the same spot
export const DRIFT_PX = 3 // the idle drift never moves a dot further than this

// FNV-1a: a 32-bit seed from any string.
export function seedFrom(id) {
  let h = 2166136261
  for (const ch of String(id)) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// mulberry32: a small repeatable stream of numbers in [0, 1) for one id.
export function randomFrom(id) {
  let a = seedFrom(id)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Jitter never pushes a dot across an axis: it stays in its quadrant
// (0 counts as Note / Hold, so a dot on an axis only moves outward).
function jitter(value, r) {
  const moved = value + (r * 2 - 1) * JITTER
  return value >= 0 ? Math.min(1, Math.max(0, moved)) : Math.max(-1, Math.min(-1e-6, moved))
}

// Field position (with jitter) and drift settings for one sound.
// drift: dx/dy in px (|d| <= DRIFT_PX), duration and delay in seconds.
export function dotLayout(sound) {
  const rand = randomFrom(sound.id)
  const x = jitter(sound.finalX, rand())
  const y = jitter(sound.finalY, rand())
  const angle = rand() * 2 * Math.PI
  const radius = DRIFT_PX * (0.5 + 0.5 * rand())
  const duration = 7 + rand() * 6
  return {
    sound,
    x,
    y,
    quadrant: sound.quadrant ?? quadrantOf(sound.finalX, sound.finalY),
    drift: {
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius,
      duration,
      delay: -rand() * duration, // start mid-cycle so dots don't move in step
    },
  }
}

// Reading order for Tab: top row first (Hold), left to right (Noise to Note).
// Ties fall back to id so the order is stable.
export function inTabOrder(dots) {
  return [...dots].sort((a, b) => b.y - a.y || a.x - b.x || String(a.sound.id).localeCompare(String(b.sound.id)))
}

// Keep the same zoomed view when the field is resized from `from` px to
// `to` px square, with `pad` px of margin. Returns the new { k, x, y }.
export function resizeTransform(t, from, to, pad) {
  const r = (to - 2 * pad) / (from - 2 * pad)
  const shift = (v) => pad + (t.k * pad + v - pad) * r - t.k * pad
  return { k: t.k, x: shift(t.x), y: shift(t.y) }
}

export function dotLabel(sound, used) {
  return `${sound.onomatopoeia}: ${sound.descriptors.join(', ')}${used ? ' (used)' : ''}`
}
