// 16-bit PCM WAV encoding.

const SAMPLE_RATE = 48000 // the engine's AudioContext rate

// Decodes a compressed recording (webm/ogg/mp4) and re-encodes it as WAV. The
// audio keeps the codec's losses; WAV only makes it easy to open in any editor.
export async function blobToWav(blob) {
  const decoder = new OfflineAudioContext(2, 1, SAMPLE_RATE)
  const audio = await decoder.decodeAudioData(await blob.arrayBuffer())
  const channels = Array.from({ length: audio.numberOfChannels }, (_, c) => audio.getChannelData(c))
  return wavBlob(channels, audio.sampleRate)
}

export function wavBlob(channels, sampleRate) {
  return new Blob([encodeWav(channels, sampleRate)], { type: 'audio/wav' })
}

// channels: one Float32Array per channel, all the same length. Samples are
// clamped to [-1, 1]. Returns an ArrayBuffer.
export function encodeWav(channels, sampleRate) {
  const frames = channels[0]?.length ?? 0
  const bytesPerFrame = channels.length * 2
  const view = new DataView(new ArrayBuffer(44 + frames * bytesPerFrame))
  const text = (offset, s) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))

  text(0, 'RIFF')
  view.setUint32(4, 36 + frames * bytesPerFrame, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, channels.length, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerFrame, true)
  view.setUint16(32, bytesPerFrame, true)
  view.setUint16(34, 16, true) // bits per sample
  text(36, 'data')
  view.setUint32(40, frames * bytesPerFrame, true)

  let offset = 44
  for (let i = 0; i < frames; i++) {
    for (const data of channels) {
      const s = Math.max(-1, Math.min(1, data[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }
  return view.buffer
}
