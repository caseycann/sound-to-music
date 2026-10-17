export class LibraryError extends Error {
  // status 401 means the class code stopped working; the caller should leave
  // the session.
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Resolves to /api/library's sounds: [{ id, onomatopoeia, descriptors,
// audioUrl, finalX, finalY, quadrant }]. The server and the browser each
// cache the answer for up to five minutes.
export async function fetchLibrary(classCode) {
  let res
  try {
    res = await fetch('/api/library', { headers: { 'X-Class-Code': classCode } })
  } catch {
    throw new LibraryError(0, 'Could not reach the server. Check your connection.')
  }
  if (!res.ok) throw new LibraryError(res.status, 'Could not load the class’s sounds. Try again.')
  const { sounds } = await res.json()
  return sounds
}
