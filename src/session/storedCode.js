// The class code is the only thing kept in localStorage for the session.
// Access can throw (private mode, blocked storage), so failures are ignored
// and the student just has to type the code again next time.
const KEY = 'fsi.classCode'

export function readStoredCode() {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function storeCode(code) {
  try {
    localStorage.setItem(KEY, code)
  } catch {}
}

export function clearStoredCode() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
