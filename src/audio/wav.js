// Decodes a compressed recording (webm/ogg/mp4) and re-encodes it as a 16-bit
// PCM WAV. The audio keeps the codec's losses; WAV only makes it easy to open
// in any editor.

const SAMPLE_RATE = 48000 // the engine's AudioContext rate

export async function blobToWav(blob) {
  const decoder = new OfflineAudioContext(2, 1, SAMPLE_RATE)
  const audio = await decoder.decodeAudioData(await blob.arrayBuffer())
  return new Blob([encodeWav(audio)], { type: 'audio/wav' })
}

function encodeWav(audio) {
  const { numberOfChannels: channels, length: frames, sampleRate } = audio
  const bytesPerFrame = channels * 2
  const view = new DataView(new ArrayBuffer(44 + frames * bytesPerFrame))
  const text = (offset, s) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))

  text(0, 'RIFF')
  view.setUint32(4, 36 + frames * bytesPerFrame, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerFrame, true)
  view.setUint16(32, bytesPerFrame, true)
  view.setUint16(34, 16, true) // bits per sample
  text(36, 'data')
  view.setUint32(40, frames * bytesPerFrame, true)

  const data = Array.from({ length: channels }, (_, c) => audio.getChannelData(c))
  let offset = 44
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }
  return view.buffer
}
