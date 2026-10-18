// What the student app needs from the browser. Checked once at load, so a
// student on an old or locked-down browser gets one clear message instead of
// a step that fails halfway through.
//
// Each entry: [what it's for, test]. `win` is window (a stand-in in tests).
const FEATURES = [
  ['opening recordings', (w) => typeof w.OfflineAudioContext === 'function' && typeof w.AudioBuffer === 'function'],
  ['playing sound', (w) => typeof w.AudioContext === 'function' && typeof w.AudioWorkletNode === 'function'],
  ['the sound engine', (w) => typeof w.WebAssembly === 'object' && typeof w.Worker === 'function'],
  ['reading files', (w) => typeof w.Blob === 'function' && typeof w.Blob.prototype.arrayBuffer === 'function'],
  ['saving sounds', (w) => typeof w.fetch === 'function' && typeof w.FormData === 'function'],
  ['pop-up messages', (w) => typeof w.HTMLDialogElement === 'function'],
]

// Names of the missing features, or [] if the browser has everything.
export function missingFeatures(win = globalThis) {
  return FEATURES.filter(([, works]) => {
    try {
      return !works(win)
    } catch {
      return true
    }
  }).map(([name]) => name)
}
