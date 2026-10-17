// Ranges for the jam controls.
export const BPM = { min: 60, max: 180, initial: 120 }
export const RATE = { min: 0.25, max: 4 } // playback rate: ±2 octaves
export const ATTACK = { min: 0, max: 1 } // seconds
export const RELEASE = { min: 0, max: 2 } // seconds
export const BEATS_PER_BAR = 4

export const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value))
