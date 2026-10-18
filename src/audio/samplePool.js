// Hands out SuperSonic buffer numbers first..first+size-1 to sounds loaded on
// first use. When every slot is taken, the least recently used sound gives
// up its slot, unless its buffer is busy (a track loops it, or it is still
// loading). Loading a sample into a used slot replaces the old one.
export function createSamplePool({ first, size }) {
  const slots = new Map() // key -> { bufferNumber, lastUsed }
  let tick = 0

  function freeSlot() {
    const used = new Set([...slots.values()].map((slot) => slot.bufferNumber))
    for (let n = first; n < first + size; n++) if (!used.has(n)) return n
    return null
  }

  function evict(busy) {
    let oldest = null
    for (const [key, slot] of slots) {
      if (busy.has(slot.bufferNumber)) continue
      if (!oldest || slot.lastUsed < oldest.slot.lastUsed) oldest = { key, slot }
    }
    if (!oldest) return null
    slots.delete(oldest.key)
    return oldest.slot.bufferNumber
  }

  return {
    // { bufferNumber, fresh }. fresh means the caller must load the sample
    // into that buffer (and call release(key) if loading fails). Throws if
    // every slot is busy.
    claim(key, busy = new Set()) {
      const hit = slots.get(key)
      if (hit) {
        hit.lastUsed = ++tick
        return { bufferNumber: hit.bufferNumber, fresh: false }
      }
      const bufferNumber = freeSlot() ?? evict(busy)
      if (bufferNumber === null) throw new Error('Too many sounds are in use. Remove a track and try again.')
      slots.set(key, { bufferNumber, lastUsed: ++tick })
      return { bufferNumber, fresh: true }
    },

    release(key) {
      slots.delete(key)
    },
  }
}
