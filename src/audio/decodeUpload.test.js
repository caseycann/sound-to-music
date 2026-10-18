import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_RECORDING_S, MAX_UPLOAD_BYTES, UploadError, decodeUpload } from './decodeUpload.js'

const file = (name, size, type = 'audio/wav') => ({ name, size, type, arrayBuffer: async () => new ArrayBuffer(8) })

function fakeDecoder(decode) {
  vi.stubGlobal('OfflineAudioContext', class {
    decodeAudioData = decode
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('decodeUpload', () => {
  it('refuses a file over the size limit before reading it', async () => {
    const decode = vi.fn()
    fakeDecoder(decode)
    await expect(decodeUpload(file('big.wav', MAX_UPLOAD_BYTES + 1))).rejects.toThrow(/is 101 MB, and the limit is 100 MB/)
    expect(decode).not.toHaveBeenCalled()
  })

  it('refuses an empty file and a file that is plainly not audio', async () => {
    fakeDecoder(vi.fn())
    await expect(decodeUpload(file('empty.wav', 0))).rejects.toThrow(/is empty/)
    await expect(decodeUpload(file('cat.jpg', 1000, 'image/jpeg'))).rejects.toThrow(/isn’t a sound file/)
  })

  it('explains a file the browser cannot decode', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fakeDecoder(() => Promise.reject(new DOMException('bad', 'EncodingError')))
    const err = await decodeUpload(file('odd.m4a', 1000, '')).catch((e) => e)
    expect(err).toBeInstanceOf(UploadError)
    expect(err.message).toMatch(/couldn’t open “odd.m4a” as audio/)
    expect(err.message).toMatch(/WAV or MP3/)
  })

  it('refuses a recording that is too long once decoded', async () => {
    fakeDecoder(async () => ({ length: 1, duration: MAX_RECORDING_S + 60 }))
    await expect(decodeUpload(file('long.mp3', 1000, 'audio/mpeg'))).rejects.toThrow(/11 minutes long, and the limit is 10 minutes/)
  })

  it('resolves with the decoded audio', async () => {
    const audio = { length: 44100, duration: 1 }
    fakeDecoder(async () => audio)
    await expect(decodeUpload(file('ok.wav', 1000))).resolves.toBe(audio)
  })
})
