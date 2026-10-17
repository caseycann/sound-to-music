import { useCallback, useEffect, useRef, useState } from 'react'
import { useSuperSonic } from '../audio/SuperSonicContext.js'
import { createSamplePool } from '../audio/samplePool.js'

// Library sounds are loaded on first click, not all at Start. A class's
// library has no size limit, and SuperSonic allows 1024 buffers by default.
// Each 3 s clip decodes to about 576 KB (float32 at 48 kHz), so preloading
// hundreds of sounds would also be a big download and a lot of memory on a
// school laptop. 128 slots is about 74 MB at most; past that, the least
// recently used sound is unloaded. Buffers below 16 are kept for the test
// sound (0) and upload previews (1).
const LIBRARY_BUFFERS = { first: 16, size: 128 }

// loadStates: soundId -> 'loading' | 'error' (missing means idle or loaded).
// ensureLoaded(sound) -> Promise<bufferNumber>. play(sound) loads if needed,
// then plays it once. Both reject if the sample can't load.
export function useLibrarySamples() {
  const { loadSample, playOnce, tracks } = useSuperSonic()
  const [pool] = useState(() => createSamplePool(LIBRARY_BUFFERS))
  const pendingRef = useRef(new Map()) // soundId -> { bufferNumber, promise }
  const tracksRef = useRef(tracks)
  const [loadStates, setLoadStates] = useState({})

  useEffect(() => { tracksRef.current = tracks }, [tracks])

  const setLoadState = useCallback((id, value) => {
    setLoadStates((prev) => {
      const next = { ...prev }
      if (value) next[id] = value
      else delete next[id]
      return next
    })
  }, [])

  const ensureLoaded = useCallback((sound) => {
    const pending = pendingRef.current.get(sound.id)
    if (pending) return pending.promise

    // Don't unload a sample a track is looping or one that is mid-load.
    const busy = new Set([
      ...tracksRef.current.map((t) => t.bufferNumber),
      ...[...pendingRef.current.values()].map((p) => p.bufferNumber),
    ])
    let slot
    try {
      slot = pool.claim(sound.id, busy)
    } catch (err) {
      return Promise.reject(err)
    }
    if (!slot.fresh) return Promise.resolve(slot.bufferNumber)

    setLoadState(sound.id, 'loading')
    const promise = loadSample(slot.bufferNumber, sound.audioUrl)
      .then(
        () => {
          setLoadState(sound.id, null)
          return slot.bufferNumber
        },
        (err) => {
          pool.release(sound.id)
          setLoadState(sound.id, 'error')
          throw err
        },
      )
      .finally(() => pendingRef.current.delete(sound.id))
    pendingRef.current.set(sound.id, { bufferNumber: slot.bufferNumber, promise })
    return promise
  }, [pool, loadSample, setLoadState])

  const play = useCallback(async (sound) => {
    playOnce(await ensureLoaded(sound))
  }, [ensureLoaded, playOnce])

  return { loadStates, ensureLoaded, play }
}
