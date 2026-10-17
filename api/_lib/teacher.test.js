import { describe, expect, it } from 'vitest'
import { TOKEN_TTL_MS, isValidToken, issueToken, login } from './teacher.js'

const config = { pin: '482913', secret: 'test-secret' }
const now = 1_800_000_000_000

describe('teacher tokens', () => {
  it('accepts a fresh token and rejects it once expired', () => {
    const { token, expiresAt } = issueToken(config, now)
    expect(expiresAt).toBe(now + TOKEN_TTL_MS)
    expect(isValidToken(token, config, now + 1000)).toBe(true)
    expect(isValidToken(token, config, expiresAt)).toBe(false)
  })

  it('rejects a token with a changed expiry or signature', () => {
    const { token } = issueToken(config, now)
    const [kind, exp, sig] = token.split('.')
    expect(isValidToken(`${kind}.${Number(exp) + 1}.${sig}`, config, now)).toBe(false)
    expect(isValidToken(`${kind}.${exp}.${sig.slice(1)}x`, config, now)).toBe(false)
    expect(isValidToken('', config, now)).toBe(false)
    expect(isValidToken(undefined, config, now)).toBe(false)
  })

  it('rejects tokens signed before the PIN or secret changed', () => {
    const { token } = issueToken(config, now)
    expect(isValidToken(token, { ...config, pin: '111111' }, now)).toBe(false)
    expect(isValidToken(token, { ...config, secret: 'other' }, now)).toBe(false)
  })
})

describe('login', () => {
  it('returns a valid token for the right PIN', () => {
    const { token } = login(' 482913 ', 'ip-ok', config, now)
    expect(isValidToken(token, config, now)).toBe(true)
  })

  it('answers 401 for a wrong PIN and 429 after five in a row', () => {
    for (let i = 0; i < 5; i++) {
      expect(() => login('000000', 'ip-guess', config, now)).toThrow(expect.objectContaining({ status: 401 }))
    }
    // Even the right PIN is refused during the lockout.
    expect(() => login('482913', 'ip-guess', config, now)).toThrow(expect.objectContaining({ status: 429 }))
    expect(login('482913', 'ip-guess', config, now + 16 * 60 * 1000).token).toBeTruthy()
  })
})
