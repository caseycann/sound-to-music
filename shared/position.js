// Field coordinates, shared by the browser and /api so both round the same
// way. Every position on the field (student, Claude, audio, final) is clamped
// to [-1, 1] and kept to two decimals: steps of 0.01.

export const STEP = 0.01

// A coordinate clamped and rounded to STEP, or null if it isn't a number.
export function toCoordinate(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const rounded = Math.round(Math.max(-1, Math.min(1, n)) * 100) / 100
  return rounded === 0 ? 0 : rounded // no -0
}
