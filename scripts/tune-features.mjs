// Runs the field-placement analysis on a folder of clips and checks each one
// lands in the quadrant its file name starts with, e.g. plinks-glass.wav,
// hums-humming.wav, clicks-nails.wav, whooshes-breath.wav.
//
//   node scripts/tune-features.mjs [folder]   (default: tuning-clips)
//
// Reads 16-bit PCM WAVs, which is what the app's "Download clip" link saves.
// tuning-clips/ is gitignored: test recordings may include voices.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeSamples } from '../src/audio/features.js'
import { quadrantOf } from '../src/field/quadrants.js'
import { mixToMono } from '../src/audio/process.js'

const QUADRANTS = ['plinks', 'hums', 'clicks', 'whooshes']

function readWav(path) {
  const buf = readFileSync(path)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV file')

  let format
  for (let offset = 12; offset + 8 <= buf.length; ) {
    const id = buf.toString('ascii', offset, offset + 4)
    const size = view.getUint32(offset + 4, true)
    const body = offset + 8
    if (id === 'fmt ') {
      format = {
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      }
    } else if (id === 'data') {
      if (format?.bits !== 16) throw new Error(`only 16-bit PCM is supported (got ${format?.bits}-bit)`)
      const frames = Math.floor(size / 2 / format.channels)
      const channels = Array.from({ length: format.channels }, () => new Float32Array(frames))
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < format.channels; c++) {
          channels[c][i] = view.getInt16(body + (i * format.channels + c) * 2, true) / 0x8000
        }
      }
      return { samples: mixToMono(channels), sampleRate: format.sampleRate }
    }
    offset = body + size + (size % 2)
  }
  throw new Error('no data chunk')
}

const fmt = (v) => (Number.isFinite(v) ? v.toFixed(3).padStart(7) : String(v).padStart(7))

const folder = process.argv[2] ?? 'tuning-clips'
const files = readdirSync(folder).filter((f) => f.toLowerCase().endsWith('.wav')).sort()
if (!files.length) {
  console.log(`No .wav files in ${folder}/`)
  process.exit(1)
}

console.log('file                          flat   pitch  attack  sustain |      x       y  quadrant')
let misses = 0
for (const file of files) {
  try {
    const { samples, sampleRate } = readWav(join(folder, file))
    const { features: f, audioX, audioY } = analyzeSamples(samples, sampleRate)
    const got = quadrantOf(audioX, audioY)
    const want = QUADRANTS.find((q) => file.toLowerCase().startsWith(q))
    const verdict = !want ? '' : got.toLowerCase() === want ? 'ok' : `MISS (want ${want})`
    if (verdict.startsWith('MISS')) misses++
    console.log(
      `${file.slice(0, 28).padEnd(28)} ${fmt(f.flatness)} ${fmt(f.pitchClarity)} ${fmt(f.attackTime)} ${fmt(f.sustainTime)} | ${fmt(audioX)} ${fmt(audioY)}  ${got} ${verdict}`,
    )
  } catch (err) {
    console.log(`${file}: ${err.message}`)
  }
}
console.log(misses ? `\n${misses} in the wrong quadrant` : '\nAll labeled clips in the right quadrant')
