// Pure helpers for showing a recording and choosing part of it. Channels are
// arrays of Float32Array (AudioBuffer.getChannelData), times are in seconds.

export const MAX_SELECTION_S = 3
export const MIN_SELECTION_S = 0.1

export const channelsOf = (audio) =>
  Array.from({ length: audio.numberOfChannels }, (_, c) => audio.getChannelData(c))

// Largest absolute sample across all channels.
export function peakLevel(channels) {
  let peak = 0
  for (const data of channels) {
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]))
  }
  return peak
}

// Min and max sample in each of `columns` slices of [startFrame, endFrame),
// across all channels, as [min0, max0, min1, max1, ...].
export function computePeaks(channels, startFrame, endFrame, columns) {
  const peaks = new Float32Array(columns * 2)
  const span = Math.max(0, endFrame - startFrame)
  for (let col = 0; col < columns; col++) {
    const from = startFrame + Math.floor((col * span) / columns)
    const to = Math.max(from + 1, startFrame + Math.floor(((col + 1) * span) / columns))
    let min = 0
    let max = 0
    for (const data of channels) {
      for (let i = from; i < to && i < data.length; i++) {
        if (data[i] < min) min = data[i]
        else if (data[i] > max) max = data[i]
      }
    }
    peaks[col * 2] = min
    peaks[col * 2 + 1] = max
  }
  return peaks
}

// The `seconds`-long window with the most energy, to 10 ms precision.
export function loudestWindow(channels, sampleRate, seconds = MAX_SELECTION_S) {
  const frames = channels[0]?.length ?? 0
  const duration = frames / sampleRate
  if (duration <= seconds) return { start: 0, end: duration }

  const blockFrames = Math.max(1, Math.round(sampleRate * 0.01))
  const blocks = Math.ceil(frames / blockFrames)
  const energy = new Float64Array(blocks)
  for (const data of channels) {
    for (let i = 0; i < frames; i++) energy[Math.floor(i / blockFrames)] += data[i] * data[i]
  }

  const windowBlocks = Math.min(blocks, Math.floor((seconds * sampleRate) / blockFrames))
  let sum = 0
  for (let b = 0; b < windowBlocks; b++) sum += energy[b]
  let best = sum
  let bestBlock = 0
  for (let b = windowBlocks; b < blocks; b++) {
    sum += energy[b] - energy[b - windowBlocks]
    if (sum > best) {
      best = sum
      bestBlock = b - windowBlocks + 1
    }
  }
  const start = Math.min((bestBlock * blockFrames) / sampleRate, duration - seconds)
  return { start, end: start + seconds }
}

// Slides a selection so it fits in [0, duration] without changing its length.
export function moveSelection({ start, end }, delta, duration) {
  const length = end - start
  const nextStart = Math.min(Math.max(0, start + delta), Math.max(0, duration - length))
  return { start: nextStart, end: nextStart + length }
}

// Moves one edge, keeping the selection between MIN_ and MAX_SELECTION_S long
// (or the whole file, if that is shorter than the minimum).
export function resizeSelection({ start, end }, edge, time, duration) {
  const min = Math.min(MIN_SELECTION_S, duration)
  if (edge === 'start') {
    const lowest = Math.max(0, end - MAX_SELECTION_S)
    return { start: Math.min(Math.max(time, lowest), end - min), end }
  }
  const highest = Math.min(duration, start + MAX_SELECTION_S)
  return { start, end: Math.max(Math.min(time, highest), start + min) }
}

// A window `padding` seconds wider than the selection on each side, kept
// inside the file.
export function viewAround({ start, end }, padding, duration) {
  return { start: Math.max(0, start - padding), end: Math.min(duration, end + padding) }
}
