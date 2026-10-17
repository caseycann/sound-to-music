import { REVERB_ROOM } from './limits.js'
import { fitEnvelope } from './tracks.js'

// Sonic Pi's sample players, keyed by buffer channel count. Parameter names
// and defaults were read from the .scsyndef files: buf, rate, attack, decay,
// sustain, release, amp, pan, lpf, hpf (each with *_slide variants), out_bus.
// sustain defaults to -1, meaning "the rest of the sample", and each synth
// frees itself when the sample ends. lpf is a MIDI note (0 turns it off).
// The mono player pans to stereo, so both write two channels.
export const PLAYERS = {
  1: 'sonic-pi-basic_mono_player',
  2: 'sonic-pi-basic_stereo_player',
}

// Sonic Pi's reverb (FreeVerb): reads a stereo in_bus, writes out_bus. mix
// crossfades dry (0) to wet (1, its default); room is the room size.
export const REVERB = 'sonic-pi-fx_reverb'

export const SYNTHDEFS = [...Object.values(PLAYERS), REVERB]

// Group that holds every track's group (see trackGroups.js), so stop() can
// silence them together. 1–999 are free for hand-picked node IDs.
export const LOOP_GROUP = 100

const OUTPUT_BUS = 0 // the speakers
const CUT_FADE_S = 0.01 // a pass cut at the bar line fades at least this long, so it doesn't click
const LIVE_SLIDE_S = 0.05 // cutoff and reverb glide this long when a slider moves

// Seconds one pass of a track's sample lasts (rate 2 plays it in half the
// time), or null if the sample can't play. buffer is { numChannels,
// duration } from loadSample.
export function playSeconds(track, buffer) {
  return buffer && PLAYERS[buffer.numChannels] ? buffer.duration / track.rate : null
}

// The /s_new packet that plays a track once at the head of its group, into
// its bus, or null if its sample can't play. With `length` (seconds), the
// pass ends that soon instead of at the end of the sample: sustain fills
// what attack and release leave.
export function trackPacket(track, buffer, { group, bus }, length = null) {
  const full = playSeconds(track, buffer)
  if (full === null) return null
  const envelope = length === null ? track : { ...track, release: Math.max(track.release, CUT_FADE_S) }
  const { attack, release } = fitEnvelope(envelope, length ?? full)
  return [
    '/s_new', PLAYERS[buffer.numChannels], -1, 0, group,
    'buf', track.bufferNumber,
    'out_bus', bus,
    'rate', track.rate,
    'attack', attack,
    'release', release,
    ...(length === null ? [] : ['sustain', Math.max(0, length - attack - release)]),
    'lpf', track.cutoff,
    'amp', track.amp,
  ]
}

// The track's reverb, at the tail of its group so it runs after the
// players. It stays until the group is freed, so tails ring across bars.
export function reverbPacket(track, { group, bus }) {
  return [
    '/s_new', REVERB, -1, 1, group,
    'in_bus', bus,
    'out_bus', OUTPUT_BUS,
    'mix', track.reverb,
    'room', REVERB_ROOM,
  ]
}

// /n_set arguments that move a sounding track's cutoff and reverb. Sent to
// the whole group: each control only reaches the synths that have it.
export function liveControls(track) {
  return ['lpf_slide', LIVE_SLIDE_S, 'lpf', track.cutoff, 'mix_slide', LIVE_SLIDE_S, 'mix', track.reverb]
}
