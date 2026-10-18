import { requestJson } from '../net/request.js'

// Resolves to /api/library's sounds: [{ id, onomatopoeia, descriptors,
// audioUrl, finalX, finalY, quadrant }]. Throws RequestError: status 401
// means the class code stopped working.
export async function fetchLibrary(classCode) {
  const { sounds } = await requestJson('/api/library', { headers: { 'X-Class-Code': classCode } })
  return sounds
}
