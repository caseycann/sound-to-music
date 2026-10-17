// Records the engine's output for a whole number of bars with MediaRecorder.
// Bars are announced by the bar clock ~150 ms before they sound, so the
// recorder starts just before the first bar and stops at the onset of the bar
// after the last one. Counting real bars keeps it right if the BPM changes.
// Only the engine's output is recorded: no microphone, no permission prompt.

const PREROLL_S = 0.05
const BITS_PER_SECOND = 256000
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']

export function startBarRecording({ audioContext, output, now, subscribeBars, bars }) {
  const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
  const destination = audioContext.createMediaStreamDestination()
  output.connect(destination)
  const recorder = new MediaRecorder(destination.stream, { mimeType, audioBitsPerSecond: BITS_PER_SECOND })

  const chunks = []
  const timers = []
  let barsSeen = 0
  let settle

  const done = new Promise((resolve, reject) => {
    settle = { resolve, reject }
  })

  function cleanup() {
    timers.forEach(clearTimeout)
    unsubscribe()
    output.disconnect(destination)
    destination.stream.getTracks().forEach((track) => track.stop())
  }

  // Runs fn when the engine clock reaches ntpTime (setTimeout precision).
  function at(ntpTime, fn) {
    timers.push(setTimeout(fn, Math.max(0, (ntpTime - now()) * 1000)))
  }

  // Stops early if called before the last bar; resolves null if nothing was recorded.
  function finish() {
    if (recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      cleanup()
      settle.resolve(null)
    }
  }

  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  recorder.onstop = () => {
    cleanup()
    settle.resolve(new Blob(chunks, { type: recorder.mimeType }))
  }
  recorder.onerror = (e) => {
    cleanup()
    settle.reject(e.error ?? new Error('Recording failed.'))
  }

  const unsubscribe = subscribeBars((time) => {
    if (barsSeen === 0) at(time - PREROLL_S, () => recorder.start())
    if (barsSeen === bars) at(time, finish)
    barsSeen++
  })

  return { done, finish }
}
