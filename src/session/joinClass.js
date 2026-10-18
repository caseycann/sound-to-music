import { postJson } from '../net/request.js'

// Asks /api/join whether the code belongs to an active class. Resolves with
// the class name. Throws RequestError: status 401 means the code doesn't
// work; anything else (including 0 for no answer) means try again later.
export async function joinClass(classCode) {
  const { className } = await postJson('/api/join', { classCode }, {
    messages: { 401: 'That class code doesn’t work. Check it with your teacher.' },
  })
  return className
}
