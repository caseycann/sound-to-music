import { describe, expect, it } from 'vitest'
import { missingFeatures } from './support.js'

class Fake {}
Fake.prototype.arrayBuffer = () => {}

const modern = {
  OfflineAudioContext: Fake,
  AudioBuffer: Fake,
  AudioContext: Fake,
  AudioWorkletNode: Fake,
  WebAssembly: {},
  Worker: Fake,
  Blob: Fake,
  fetch: () => {},
  FormData: Fake,
  HTMLDialogElement: Fake,
}

describe('missingFeatures', () => {
  it('finds nothing missing in a modern browser', () => {
    expect(missingFeatures(modern)).toEqual([])
  })

  it('names what is missing', () => {
    const { AudioWorkletNode: _, HTMLDialogElement: __, ...old } = modern
    expect(missingFeatures(old)).toEqual(['playing sound', 'pop-up messages'])
  })

  it('counts a test that throws as missing', () => {
    expect(missingFeatures({ ...modern, Blob: undefined })).toEqual(['reading files'])
  })
})
