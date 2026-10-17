import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SuperSonic } from 'supersonic-scsynth'
import { SuperSonicContext } from './SuperSonicContext.js'
import { createBarClock } from './barClock.js'
import { startBarRecording } from './barRecorder.js'
import { BEATS_PER_BAR, BPM, clamp } from './limits.js'
import { LOOP_GROUP, PLAYERS, trackPacket } from './players.js'
import { useTracks } from './useTracks.js'

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

function createEngine() {
  const engine = new SuperSonic(ENGINE_OPTIONS)
  // 'setup' runs on first boot and after a full reload, so the group always exists.
  engine.on('setup', async () => {
    engine.send('/g_new', LOOP_GROUP, 0, 0)
    await engine.sync()
  })
  return engine
}

export default function SuperSonicProvider({ children }) {
  const engineRef = useRef(null)
  const readyRef = useRef(false)
  const buffersRef = useRef(new Map()) // bufferNumber -> { numChannels, duration }
  const clockRef = useRef(null)
  const stoppingRef = useRef(null)
  const barListenersRef = useRef(new Set())
  const recordingRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [bpm, setBpmState] = useState(BPM.initial)
  const [playing, setPlaying] = useState(false)
  const { tracks, addTrack, updateTrack, removeTrack } = useTracks()

  // The bar clock reads these between renders.
  const tracksRef = useRef(tracks)
  const bpmRef = useRef(bpm)
  useEffect(() => { tracksRef.current = tracks }, [tracks])
  useEffect(() => { bpmRef.current = bpm }, [bpm])

  // Must be called from a click handler: browsers only start audio after a gesture.
  const start = useCallback(async () => {
    if (readyRef.current) return
    engineRef.current ??= createEngine()
    setStatus('loading')
    setError(null)
    try {
      // init() is safe to repeat: concurrent calls share one boot, and it can
      // be retried after a failure.
      await engineRef.current.init()
      await engineRef.current.loadSynthDefs(Object.values(PLAYERS))
      await engineRef.current.sync()
      readyRef.current = true
      setStatus('ready')
    } catch (err) {
      console.error('SuperSonic failed to start', err)
      setError(err)
      setStatus('error')
    }
  }, [])

  useEffect(() => () => {
    clockRef.current?.stop()
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

  // Every unmuted track fires once at the start of each bar, all in one bundle
  // stamped with the bar's time.
  const scheduleBar = useCallback((time) => {
    const packets = tracksRef.current
      .filter((track) => !track.muted)
      .map((track) => trackPacket(track, buffersRef.current.get(track.bufferNumber)))
      .filter(Boolean)
    if (packets.length) engineRef.current.sendOSC(SuperSonic.osc.encodeBundle(time, packets))
    barListenersRef.current.forEach((listener) => listener(time))
  }, [])

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
      getBarSeconds: () => (60 / bpmRef.current) * BEATS_PER_BAR,
      onBar: scheduleBar,
    })
    clockRef.current.start()
    setPlaying(true)
  }, [getEngine, scheduleBar])

  const stop = useCallback(() => {
    clockRef.current?.stop()
    recordingRef.current?.finish() // keeps what was recorded so far
    setPlaying(false)
    if (!readyRef.current) return
    const engine = engineRef.current
    stoppingRef.current = (async () => {
      // Drop bars already sent ahead, then fade out and free whatever is sounding.
      await engine.purge()
      engine.send('/n_set', LOOP_GROUP, 'amp_slide', STOP_FADE_S, 'amp', 0)
      engine.sendOSC(SuperSonic.osc.encodeBundle(engine.clock.now() + STOP_FADE_S, [
        ['/g_freeAll', LOOP_GROUP],
      ]))
    })()
    return stoppingRef.current
  }, [])

  const setBpm = useCallback((value) => setBpmState(clamp(value, BPM)), [])

  const value = useMemo(
    () => ({
      status, error, start, loadSample, playOnce,
      tracks, addTrack, updateTrack, removeTrack,
      bpm, setBpm, playing, play, stop, recordBars,
    }),
    [status, error, start, loadSample, playOnce, tracks, addTrack, updateTrack, removeTrack, bpm, setBpm, playing, play, stop, recordBars],
  )

  return <SuperSonicContext.Provider value={value}>{children}</SuperSonicContext.Provider>
}
