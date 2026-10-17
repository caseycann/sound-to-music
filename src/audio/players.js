import { fitEnvelope } from './tracks.js'

// Sonic Pi's sample players, keyed by buffer channel count. Parameter names
// were read from the .scsyndef files: buf, rate, attack, decay, sustain,
// release, amp, pan, lpf, hpf (each with *_slide variants). sustain defaults
// to -1, meaning "the rest of the sample", and each synth frees itself when
// the sample ends.
export const PLAYERS = {
  1: 'sonic-pi-basic_mono_player',
  2: 'sonic-pi-basic_stereo_player',
}

// Group that holds every looping synth, so stop() can silence them together.
// 1–999 are free for hand-picked node IDs.
export const LOOP_GROUP = 100

// The /s_new packet that plays a track once, or null if its sample can't play.
// buffer is { numChannels, duration } from loadSample.
export function trackPacket(track, buffer) {
  const player = buffer && PLAYERS[buffer.numChannels]
  if (!player) return null
  const { attack, release } = fitEnvelope(track, buffer.duration / track.rate)
  return [
    '/s_new', player, -1, 0, LOOP_GROUP,
    'buf', track.bufferNumber,
    'rate', track.rate,
    'attack', attack,
    'release', release,
    'amp', track.amp,
  ]
}
