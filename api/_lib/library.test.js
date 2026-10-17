import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listAllRecords } from './airtable.js'
import { CACHE_MS, approvedInClass, clearLibraryCache, getLibrary, invalidateLibrary, toLibrarySound } from './library.js'

vi.mock('./airtable.js', () => ({ listAllRecords: vi.fn() }))

const CLASS = { id: 'recClassAAAAAAAAAA', code: 'TEST01' }

function sound(id, fields, createdTime = '2026-10-01T00:00:00.000Z') {
  return {
    id,
    createdTime,
    fields: {
      Onomatopoeia: 'bzzt',
      'Descriptor 1': 'buzzy',
      'Descriptor 2': 'bright',
      'Cloudinary ID': `found-sound/${id}`,
      'Final X': 0.4,
      'Final Y': -0.2,
      Class: [CLASS.id],
      ...fields,
    },
  }
}

describe('toLibrarySound', () => {
  it('maps a record to a library entry with a WAV URL and its quadrant', () => {
    expect(toLibrarySound(sound('rec1', {}), 'demo')).toEqual({
      id: 'rec1',
      onomatopoeia: 'bzzt',
      descriptors: ['buzzy', 'bright'],
      audioUrl: 'https://res.cloudinary.com/demo/video/upload/found-sound/rec1.wav',
      finalX: 0.4,
      finalY: -0.2,
      quadrant: 'Plinks',
    })
  })

  it('rounds Final X/Y and skips sounds with no position or no audio', () => {
    expect(toLibrarySound(sound('rec1', { 'Final X': 0.456, 'Final Y': 3 }), 'demo')).toMatchObject({ finalX: 0.46, finalY: 1 })
    expect(toLibrarySound(sound('rec1', { 'Final X': undefined }), 'demo')).toBeNull()
    expect(toLibrarySound(sound('rec1', { 'Cloudinary ID': undefined }), 'demo')).toBeNull()
  })
})

describe('approvedInClass', () => {
  it('matches Approved sounds whose Class codes include this code', () => {
    expect(approvedInClass('TEST01')).toBe(
      "AND({Status}='Approved', FIND(',TEST01,', ',' & SUBSTITUTE(UPPER(ARRAYJOIN({Class}, ',')), ' ', '') & ','))",
    )
  })
})

describe('getLibrary', () => {
  beforeEach(() => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo')
    vi.stubEnv('CLOUDINARY_API_KEY', 'key')
    vi.stubEnv('CLOUDINARY_API_SECRET', 'secret')
    clearLibraryCache()
    listAllRecords.mockReset()
  })
  afterEach(() => vi.unstubAllEnvs())

  it('keeps only this class’s sounds, oldest first', async () => {
    listAllRecords.mockResolvedValue([
      sound('recNew', {}, '2026-10-02T00:00:00.000Z'),
      sound('recOther', { Class: ['recClassBBBBBBBBBB'] }),
      sound('recOld', {}, '2026-09-01T00:00:00.000Z'),
    ])
    const sounds = await getLibrary(CLASS)
    expect(sounds.map((s) => s.id)).toEqual(['recOld', 'recNew'])
  })

  it('caches for CACHE_MS, then fetches again', async () => {
    listAllRecords.mockResolvedValue([])
    await getLibrary(CLASS, 0)
    await getLibrary(CLASS, CACHE_MS - 1)
    expect(listAllRecords).toHaveBeenCalledTimes(1)
    await getLibrary(CLASS, CACHE_MS)
    expect(listAllRecords).toHaveBeenCalledTimes(2)
  })

  it('fetches again after invalidateLibrary', async () => {
    listAllRecords.mockResolvedValue([])
    await getLibrary(CLASS, 0)
    invalidateLibrary(['recSomeOtherClass'])
    await getLibrary(CLASS, 1)
    expect(listAllRecords).toHaveBeenCalledTimes(1)
    invalidateLibrary([CLASS.id])
    await getLibrary(CLASS, 2)
    expect(listAllRecords).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failure', async () => {
    listAllRecords.mockRejectedValueOnce(new Error('Airtable 503')).mockResolvedValue([])
    await expect(getLibrary(CLASS, 0)).rejects.toThrow('Airtable 503')
    await expect(getLibrary(CLASS, 1)).resolves.toEqual([])
  })
})
