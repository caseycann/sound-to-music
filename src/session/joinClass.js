export class JoinError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Asks /api/join whether the code belongs to an active class. Resolves with
// the class name. Throws JoinError: status 401 means the code doesn't work;
// anything else (including 0 for a network failure) means try again later.
export async function joinClass(classCode) {
  let res
  try {
    res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classCode }),
    })
  } catch {
    throw new JoinError(0, 'Could not reach the server. Check your connection and try again.')
  }
  if (res.status === 401) throw new JoinError(401, 'That class code doesn’t work. Check it with your teacher.')
  if (!res.ok) throw new JoinError(res.status, 'Something went wrong on our end. Try again in a minute.')
  const { className } = await res.json()
  return className
}
