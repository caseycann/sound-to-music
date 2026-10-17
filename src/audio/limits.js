// Ranges for the jam controls.
export const BPM = { min: 60, max: 180, initial: 120 }
export const RATE = { min: 0.25, max: 4 } // playback rate: ±2 octaves
export const ATTACK = { min: 0, max: 1 } // seconds
export const RELEASE = { min: 0, max: 2 } // seconds
// Linear gain. Below 1 by default so eight normalized clips on the same beat
// don't clip as badly.
export const AMP = { min: 0, max: 1, initial: 0.6 }
// Low-pass cutoff as a MIDI note: 40 is about 82 Hz (very muffled), 130 about
// 15 kHz (open). The filter is always on; at 130 it is hard to hear.
export const CUTOFF = { min: 40, max: 130, initial: 130 }
export const REVERB = { min: 0, max: 1, initial: 0 } // reverb mix: 0 dry, 1 all reverb
export const REVERB_ROOM = 0.7 // room size for every track's reverb (0–1)
export const BEATS_PER_BAR = 4
export const LOOP_BARS = 4 // each track can play or rest in each bar of the loop
// Where in the bar a track starts, in beats after the bar line, in quarter
// beats: 0 is beat 1, 1.5 is halfway through beat 2, 3.75 the last quarter.
export const OFFSET = { min: 0, max: BEATS_PER_BAR - 0.25, step: 0.25, initial: 0 }

export const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value))
