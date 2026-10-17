// "The class library just changed": sent after this student's own sound is
// placed or moved, so an open Jam refetches at once instead of waiting for
// its next timed refresh (see useLibrary).
const target = new EventTarget()

export function notifyLibraryChanged() {
  target.dispatchEvent(new Event('change'))
}

// Returns a function that stops listening.
export function onLibraryChanged(listener) {
  target.addEventListener('change', listener)
  return () => target.removeEventListener('change', listener)
}
