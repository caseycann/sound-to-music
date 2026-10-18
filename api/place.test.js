import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRecord, listRecords, updateRecord } from './_lib/airtable.js'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create }
  },
}))
vi.mock('./_lib/airtable.js', () => ({
  listRecords: vi.fn(),
  getRecord: vi.fn(),
  updateRecord: vi.fn(),
}))

const { default: handler } = await import('./place.js')

const CLASS_ID = 'recClassAAAAAAAAAA'
const SOUND_ID = 'recSoundAAAAAAAAA'

function call(body = { classCode: 'TEST01', soundId: SOUND_ID }) {
  const res = {
    statusCode: 200,
    body: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this },
    json(value) { this.body = value; return this },
  }
  return handler({ method: 'POST', body, headers: {} }, res).then(() => res)
}

function claudeSays(answer) {
  create.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(answer) }] })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  listRecords.mockResolvedValue([{ id: CLASS_ID, fields: { Code: 'TEST01', Active: true } }])
  getRecord.mockResolvedValue({
    id: SOUND_ID,
    fields: { Class: [CLASS_ID], Onomatopoeia: 'bzzt', 'Descriptor 1': 'buzzy', 'Descriptor 2': 'bright', 'Audio X': -0.4, 'Audio Y': 0.6, Status: 'Pending' },
  })
  updateRecord.mockResolvedValue({})
})

describe('/api/place', () => {
  it('blends a confident answer and approves the sound', async () => {
    claudeSays({ x: 0.8, y: 0.2, confidence: 0.9, needs_review: false, reason: 'It buzzes.' })
    const res = await call()
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ claude: { x: 0.8, y: 0.2 }, final: { x: 0.2, y: 0.4 }, needsReview: false })
    expect(updateRecord).toHaveBeenCalledWith('Sounds', SOUND_ID, expect.objectContaining({ Status: 'Approved', 'Needs review': false }))
  })

  it.each([
    ['the API errors', () => create.mockRejectedValue(Object.assign(new Error('overloaded'), { status: 529 }))],
    ['the call times out', () => create.mockRejectedValue(new Error('Request timed out.'))],
    ['Claude refuses', () => create.mockResolvedValue({ stop_reason: 'refusal', content: [] })],
    ['the answer is cut off', () => create.mockResolvedValue({ stop_reason: 'max_tokens', content: [] })],
    ['the answer is not valid', () => claudeSays({ x: 'left' })],
  ])('still places the sound from the audio and flags it when %s', async (_, setup) => {
    setup()
    const res = await call()
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ claude: null, final: { x: -0.4, y: 0.6 }, needsReview: true })
    const fields = updateRecord.mock.calls[0][2]
    expect(fields).toMatchObject({ 'Final X': -0.4, 'Final Y': 0.6, 'Needs review': true, Status: 'Pending' })
    expect(fields).not.toHaveProperty('Claude X') // left empty so it can be scored again
  })

  it('answers 200 and flags a sound with no audio estimate when Claude fails', async () => {
    create.mockRejectedValue(new Error('down'))
    getRecord.mockResolvedValue({ id: SOUND_ID, fields: { Class: [CLASS_ID], Onomatopoeia: 'bzzt', Status: 'Pending' } })
    const res = await call()
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ final: null, needsReview: true })
    expect(updateRecord.mock.calls[0][2]).not.toHaveProperty('Final X')
  })
})
