// One scsynth group per track, inside LOOP_GROUP, so a single track can be
// faded out and freed while the others play on. The group holds the track's
// players and, at its tail, its reverb; the players write to the track's own
// stereo bus and the reverb reads it.
//
// Group numbers count up and wrap instead of reusing the lowest free one: a
// freed number may still have a timed /n_free on its way, which must not hit
// a new track's group. Buses can be reused at once: anything still aimed at
// a freed group's bus finds no group and doesn't play.
const FIRST = 101
const LAST = 999
// Buses 0–1 are the speakers and 2–3 the (unused) input; private buses start
// well above them. 64 stereo pairs is far more than MAX_TRACKS.
const FIRST_BUS = 16
const BUS_PAIRS = 64

export function createTrackGroups() {
  const groups = new Map() // trackId -> { group, bus }
  let next = FIRST

  function freeBus() {
    const used = new Set([...groups.values()].map((g) => g.bus))
    for (let i = 0; i < BUS_PAIRS; i++) {
      const bus = FIRST_BUS + 2 * i
      if (!used.has(bus)) return bus
    }
    throw new Error('No free audio bus for another track.')
  }

  return {
    // { group, bus, fresh }. fresh means the caller must create the group
    // and its reverb.
    claim(trackId) {
      const hit = groups.get(trackId)
      if (hit) return { ...hit, fresh: false }
      const entry = { group: next, bus: freeBus() }
      next = next >= LAST ? FIRST : next + 1
      groups.set(trackId, entry)
      return { ...entry, fresh: true }
    },
    get: (trackId) => groups.get(trackId)?.group,
    release: (trackId) => groups.delete(trackId),
    clear: () => groups.clear(),
  }
}
