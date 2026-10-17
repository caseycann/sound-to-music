import { describe, expect, it } from 'vitest'
import { checkWords, normalizeWord, wordProblem } from './words.js'

describe('normalizeWord', () => {
  it('lowercases, trims and collapses spaces', () => {
    expect(normalizeWord('  Very   BUZZY ')).toBe('very buzzy')
  })

  it('treats non-strings as empty', () => {
    expect(normalizeWord(undefined)).toBe('')
    expect(normalizeWord(42)).toBe('')
  })
})

describe('wordProblem', () => {
  it('accepts letters, spaces and hyphens', () => {
    expect(wordProblem('bzzt')).toBeNull()
    expect(wordProblem('ear-splitting')).toBeNull()
    expect(wordProblem('kind of soft')).toBeNull()
    expect(wordProblem('café')).toBeNull()
  })

  it('rejects empty, too long, digits and punctuation', () => {
    expect(wordProblem('')).toMatch(/fill/i)
    expect(wordProblem('a'.repeat(21))).toMatch(/20/)
    expect(wordProblem('a'.repeat(20))).toBeNull()
    expect(wordProblem('bzzt2')).toMatch(/letters/)
    expect(wordProblem('pop!')).toMatch(/letters/)
    expect(wordProblem('<b>')).toMatch(/letters/)
  })

  it('needs at least one letter', () => {
    expect(wordProblem('-')).toMatch(/letters/)
  })
})

describe('checkWords', () => {
  it('returns normalized words and no problems for valid input', () => {
    const result = checkWords({ onomatopoeia: ' BZZT', descriptor1: 'Buzzy', descriptor2: 'bright ' })
    expect(result).toEqual({
      words: { onomatopoeia: 'bzzt', descriptor1: 'buzzy', descriptor2: 'bright' },
      problems: {},
    })
  })

  it('reports each bad field', () => {
    const { problems } = checkWords({ onomatopoeia: 'bzzt', descriptor1: '', descriptor2: '123' })
    expect(Object.keys(problems)).toEqual(['descriptor1', 'descriptor2'])
  })
})
