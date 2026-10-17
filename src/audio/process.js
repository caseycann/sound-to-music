import { channelsOf } from './waveform.js'
import { wavBlob } from './wav.js'

// Turns the chosen part of an upload into the clip we store: mono, 44.1 kHz,
// high-passed, trimmed, faded, normalized, 16-bit WAV.
//
// processSelection needs Web Audio (OfflineAudioContext); every other export
// is a pure function on Float32Arrays, so it can be tested without a browser.

export const TARGET_RATE = 44100
export const HIGHPASS_HZ = 80
export const SILENCE_DBFS = -45
export const FADE_S = 0.01
export const PEAK_DBFS = -1

// Web Audio reads a highpass Q in dB. -3.01 dB (a linear Q of 1/√2) is a
// Butterworth response: no bump at the cutoff.
const BUTTERWORTH_Q_DB = 20 * Math.log10(Math.SQRT1_2)

export class SilentClipError extends Error {
  constructor() {
    super('That part is too quiet to use. Choose a louder part.')
  }
}

export const dbToGain = (db) => 10 ** (db / 20)

// Average of all channels.
export function mixToMono(channels) {
  const frames = channels[0]?.length ?? 0
  const mono = new Float32Array(frames)
  for (const data of channels) {
    for (let i = 0; i < frames; i++) mono[i] += data[i]
  }
  if (channels.length > 1) for (let i = 0; i < frames; i++) mono[i] /= channels.length
  return mono
}

// [start, end) frames between the first and last sample louder than
// `threshold` (linear), or null if none is.
export function findSoundBounds(samples, threshold) {
  let start = 0
  while (start < samples.length && Math.abs(samples[start]) <= threshold) start++
  if (start === samples.length) return null
  let end = samples.length
  while (Math.abs(samples[end - 1]) <= threshold) end--
  return { start, end }
}

// Linear fade-in and fade-out of `fadeFrames` each (shortened for tiny clips).
export function applyFades(samples, fadeFrames) {
  const out = samples.slice()
  const n = Math.min(fadeFrames, Math.floor(out.length / 2))
  for (let i = 0; i < n; i++) {
    const gain = i / n
    out[i] *= gain
    out[out.length - 1 - i] *= gain
  }
  return out
}

// Scales so the loudest sample sits at `peakDb` dBFS.
export function normalizePeak(samples, peakDb) {
  let peak = 0
  for (const s of samples) peak = Math.max(peak, Math.abs(s))
  if (peak === 0) return samples.slice()
  const gain = dbToGain(peakDb) / peak
  return samples.map((s) => s * gain)
}

// Trim, fade and normalize an already filtered mono clip. The trim keeps
// FADE_S of quiet before the first sound and after the last, so the fades
// fall on near-silence and don't soften the attack. Throws SilentClipError if
// nothing is above SILENCE_DBFS.
export function finishClip(samples, sampleRate) {
  const bounds = findSoundBounds(samples, dbToGain(SILENCE_DBFS))
  if (!bounds) throw new SilentClipError()
  const fadeFrames = Math.round(FADE_S * sampleRate)
  const start = Math.max(0, bounds.start - fadeFrames)
  const end = Math.min(samples.length, bounds.end + fadeFrames)
  return normalizePeak(applyFades(samples.slice(start, end), fadeFrames), PEAK_DBFS)
}

// The selection [startS, endS) of `channels` (at `sampleRate`), mixed to mono.
export function sliceMono(channels, sampleRate, startS, endS) {
  const from = Math.max(0, Math.floor(startS * sampleRate))
  const to = Math.min(channels[0].length, Math.ceil(endS * sampleRate))
  return mixToMono(channels.map((data) => data.subarray(from, to)))
}

// audio: a decoded AudioBuffer. Resolves with { blob, samples, sampleRate,
// duration }, where samples is the finished mono Float32Array.
export async function processSelection(audio, startS, endS) {
  const mono = sliceMono(channelsOf(audio), audio.sampleRate, startS, endS)
  if (mono.length === 0) throw new SilentClipError()

  const source = new AudioBuffer({ length: mono.length, numberOfChannels: 1, sampleRate: audio.sampleRate })
  source.copyToChannel(mono, 0)

  // Playing a buffer into a context at another rate resamples it.
  const length = Math.max(1, Math.round((mono.length * TARGET_RATE) / audio.sampleRate))
  const context = new OfflineAudioContext(1, length, TARGET_RATE)
  const player = new AudioBufferSourceNode(context, { buffer: source })
  const highpass = new BiquadFilterNode(context, { type: 'highpass', frequency: HIGHPASS_HZ, Q: BUTTERWORTH_Q_DB })
  player.connect(highpass).connect(context.destination)
  player.start()
  const rendered = await context.startRendering()

  const samples = finishClip(rendered.getChannelData(0), TARGET_RATE)
  return {
    blob: wavBlob([samples], TARGET_RATE),
    samples,
    sampleRate: TARGET_RATE,
    duration: samples.length / TARGET_RATE,
  }
}
