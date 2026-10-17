import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SuperSonic } from 'supersonic-scsynth'
import { SuperSonicContext } from './SuperSonicContext.js'
import { createBarClock } from './barClock.js'
import { startBarRecording } from './barRecorder.js'
import { canAddTrack } from './jam.js'
import { BEATS_PER_BAR, LOOP_BARS } from './limits.js'
import { LOOP_GROUP, PLAYERS, SYNTHDEFS, liveControls, playSeconds, reverbPacket, trackPacket } from './players.js'
import { createTrackGroups } from './trackGroups.js'
import { barPasses, createTrack } from './tracks.js'
import { useJam } from './useJam.js'

// The only file that imports supersonic-scsynth (CLAUDE.md rule 7).
//
// Self-hosted from public/supersonic/ (see scripts/copy-supersonic.mjs), so no
// third-party CDN sees students' requests. The page is not cross-origin
// isolated, so SuperSonic runs in postMessage mode and needs no COOP/COEP.
const ENGINE_OPTIONS = {
  baseURL: '/supersonic/', // workers/ and synthdefs/
  coreBaseURL: '/supersonic/core/', // wasm/ and workers/clockwork_audio_worklet.js
}

const STOP_FADE_S = 0.05

function createEngine({ onSetup }) {
  const engine = new SuperSonic(ENGINE_OPTIONS)
  // 'setup' runs on first boot and after a full reload, so the group always
  // exists. A reload also drops the track groups, so forget them.
  engine.on('setup', async () => {
    onSetup()
    engine.send('/g_new', LOOP_GROUP, 0, 0)
    await engine.sync()
  })
  return engine
}

const bundle = (time, packets) => SuperSonic.osc.encodeBundle(time, packets)

export default function SuperSonicProvider({ children }) {
  const engineRef = useRef(null)
  const readyRef = useRef(false)
  const buffersRef = useRef(new Map()) // bufferNumber -> { numChannels, duration }
  const clockRef = useRef(null)
  const stoppingRef = useRef(null)
  const barListenersRef = useRef(new Set())
  const recordingRef = useRef(null)
  const lastBarRef = useRef(null) // time of the last bar sent to the engine
  const barTimersRef = useRef(new Set())
  const [groups] = useState(createTrackGroups)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [currentBar, setCurrentBar] = useState(null) // 0..LOOP_BARS-1 while playing
  const { jam, jamRef, dispatch } = useJam() // the bar clock reads jamRef

  // Must be called from a click handler: browsers only start audio after a gesture.
  const start = useCallback(async () => {
    if (readyRef.current) return
    engineRef.current ??= createEngine({ onSetup: groups.clear })
    setStatus('loading')
    setError(null)
    try {
      // init() is safe to repeat: concurrent calls share one boot, and it can
      // be retried after a failure.
      await engineRef.current.init()
      await engineRef.current.loadSynthDefs(SYNTHDEFS)
      await engineRef.current.sync()
      readyRef.current = true
      setStatus('ready')
    } catch (err) {
      console.error('SuperSonic failed to start', err)
      setError(err)
      setStatus('error')
    }
  }, [groups])

  useEffect(() => () => {
    clockRef.current?.stop()
    barTimersRef.current.forEach(clearTimeout)
    readyRef.current = false
    engineRef.current?.destroy()
    engineRef.current = null
  }, [])

  const getEngine = useCallback(() => {
    if (!readyRef.current) throw new Error('Audio engine is not started yet.')
    return engineRef.current
  }, [])

  const loadSample = useCallback(async (bufferNumber, url) => {
    const info = await getEngine().loadSample(bufferNumber, url)
    buffersRef.current.set(bufferNumber, { numChannels: info.numChannels, duration: info.duration })
    return info
  }, [getEngine])

  const playOnce = useCallback((bufferNumber) => {
    const engine = getEngine()
    const buffer = buffersRef.current.get(bufferNumber)
    if (!buffer) throw new Error(`No sample loaded in buffer ${bufferNumber}.`)
    const player = PLAYERS[buffer.numChannels]
    if (!player) throw new Error(`Only mono or stereo samples can play (got ${buffer.numChannels} channels).`)
    // -1: let scsynth pick the node ID. The player frees itself when done.
    engine.send('/s_new', player, -1, 0, 0, 'buf', bufferNumber)
  }, [getEngine])

  // Every unmuted track that plays in this bar of the loop is sent now. Hits
  // on the bar line share one bundle stamped with the bar's time; a hit
  // later in the bar (a start offset, or the later passes of a track that
  // loops the whole bar) gets its own timed bundle. stop() purges them;
  // silenceTrack frees the group they target.
  // A track's group (with its reverb) is made in the first bar it plays.
  const scheduleBar = useCallback((time, index) => {
    const loopBar = index % LOOP_BARS
    const barSeconds = (60 / jamRef.current.bpm) * BEATS_PER_BAR
    const packets = []
    const later = []
    for (const track of jamRef.current.tracks) {
      if (track.muted || !track.bars[loopBar]) continue
      const buffer = buffersRef.current.get(track.bufferNumber)
      const seconds = playSeconds(track, buffer)
      if (seconds === null) continue
      const { fresh, ...slot } = groups.claim(track.id)
      if (fresh) packets.push(['/g_new', slot.group, 1, LOOP_GROUP], reverbPacket(track, slot))
      const startSeconds = (track.offset / BEATS_PER_BAR) * barSeconds
      for (const { offset, length } of barPasses(seconds, barSeconds, { loop: track.loop, startSeconds })) {
        const packet = trackPacket(track, buffer, slot, length)
        if (offset === 0) packets.push(packet)
        else later.push(bundle(time + offset, [packet]))
      }
    }
    if (packets.length) engineRef.current.sendOSC(bundle(time, packets))
    later.forEach((b) => engineRef.current.sendOSC(b))
    lastBarRef.current = time
    barListenersRef.current.forEach((listener) => listener(time))

    // Light up the bar when it sounds, not when it is sent (~150 ms early).
    const timers = barTimersRef.current
    const timer = setTimeout(() => {
      timers.delete(timer)
      setCurrentBar(loopBar)
    }, Math.max(0, (time - engineRef.current.clock.now()) * 1000))
    timers.add(timer)
  }, [jamRef, groups])

  // Fades out whatever one track is playing, including a bar already sent
  // ahead, then frees its group. Passes already sent for the rest of the bar
  // then find no group and don't sound (scsynth logs "Group not found").
  // The track gets a new group the next time it plays.
  const silenceTrack = useCallback((trackId) => {
    const group = groups.get(trackId)
    if (group === undefined || !readyRef.current) return
    groups.release(trackId)
    const engine = engineRef.current
    const at = Math.max(engine.clock.now(), lastBarRef.current ?? 0)
    engine.sendOSC(bundle(at, [['/n_set', group, 'amp_slide', STOP_FADE_S, 'amp', 0]]))
    engine.sendOSC(bundle(at + STOP_FADE_S, [['/n_free', group]]))
  }, [groups])

  // Returns the new track's id, or null if the jam is full or the sound was
  // already used this session.
  const addTrack = useCallback((bufferNumber, overrides) => {
    const track = createTrack(bufferNumber, overrides)
    const next = dispatch({ type: 'addTrack', track })
    return next.tracks.some((t) => t.id === track.id) ? track.id : null
  }, [dispatch])

  const updateTrack = useCallback((id, patch) => {
    const before = jamRef.current.tracks.find((t) => t.id === id)
    const after = dispatch({ type: 'updateTrack', id, patch }).tracks.find((t) => t.id === id)
    if (before && !before.muted && patch.muted) silenceTrack(id)
    // Cutoff and reverb also change what is sounding now, not just the next bar.
    const group = groups.get(id)
    if (after && group !== undefined && readyRef.current && ('cutoff' in patch || 'reverb' in patch)) {
      engineRef.current.send('/n_set', group, ...liveControls(after))
    }
  }, [dispatch, jamRef, groups, silenceTrack])

  const removeTrack = useCallback((id) => {
    silenceTrack(id)
    dispatch({ type: 'removeTrack', id })
  }, [dispatch, silenceTrack])

  const setBpm = useCallback((bpm) => dispatch({ type: 'setBpm', bpm }), [dispatch])

  // Records `bars` whole bars of the running loop. Resolves with the
  // compressed Blob (webm/ogg/mp4, whatever the browser records), or null if
  // the loop was stopped before the first bar.
  const recordBars = useCallback(async (bars) => {
    const engine = getEngine()
    if (!clockRef.current?.running) throw new Error('Play the loop before recording.')
    if (recordingRef.current) throw new Error('Already recording.')
    if (!Number.isInteger(bars) || bars < 1) throw new Error('Record at least one bar.')
    const listeners = barListenersRef.current
    recordingRef.current = startBarRecording({
      audioContext: engine.audioContext,
      output: engine.node,
      now: () => engine.clock.now(),
      subscribeBars: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      bars,
    })
    try {
      return await recordingRef.current.done
    } finally {
      recordingRef.current = null
    }
  }, [getEngine])

  const play = useCallback(async () => {
    const engine = getEngine()
    await stoppingRef.current
    clockRef.current ??= createBarClock({
      now: () => engine.clock.now(),
      getBarSeconds: () => (60 / jamRef.current.bpm) * BEATS_PER_BAR,
      onBar: scheduleBar,
    })
    clockRef.current.start()
    setPlaying(true)
  }, [getEngine, jamRef, scheduleBar])

  const stop = useCallback(() => {
    clockRef.current?.stop()
    lastBarRef.current = null
    barTimersRef.current.forEach(clearTimeout)
    barTimersRef.current.clear()
    setCurrentBar(null)
    recordingRef.current?.finish() // keeps what was recorded so far
    setPlaying(false)
    if (!readyRef.current) return
    const engine = engineRef.current
    stoppingRef.current = (async () => {
      // Drop bars already sent ahead, then fade out and free whatever is
      // sounding, reverb tails included. /n_set on a group reaches every
      // track group inside it; /g_freeAll frees the track groups too, so
      // each track makes a new group and reverb when it next plays.
      await engine.purge()
      engine.send('/n_set', LOOP_GROUP, 'amp_slide', STOP_FADE_S, 'amp', 0)
      engine.sendOSC(bundle(engine.clock.now() + STOP_FADE_S, [['/g_freeAll', LOOP_GROUP]]))
      groups.clear()
    })()
    return stoppingRef.current
  }, [groups])

  const usedIds = useMemo(() => new Set(jam.usedIds), [jam.usedIds])

  const value = useMemo(
    () => ({
      status, error, start, loadSample, playOnce,
      jam, tracks: jam.tracks, bpm: jam.bpm, usedIds, canAddTrack: canAddTrack(jam),
      addTrack, updateTrack, removeTrack, setBpm,
      playing, currentBar, play, stop, recordBars,
    }),
    [status, error, start, loadSample, playOnce, jam, usedIds, addTrack, updateTrack, removeTrack, setBpm, playing, currentBar, play, stop, recordBars],
  )

  return <SuperSonicContext.Provider value={value}>{children}</SuperSonicContext.Provider>
}
