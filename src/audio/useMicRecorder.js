import { useCallback, useEffect, useRef, useState } from 'react'

// Long enough to catch one sound and choose 3 s of it.
export const MAX_MIC_S = 5
// Seconds counted down, after the microphone is allowed, before recording
// starts: time to get the sound ready.
export const COUNTDOWN_S = 3

// Found sounds should arrive as they are: phone-call processing would
// cancel, gate and level them.
const CONSTRAINTS = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']

export const micSupported = () =>
  Boolean(globalThis.navigator?.mediaDevices?.getUserMedia) && typeof globalThis.MediaRecorder === 'function'

// Records from the microphone with MediaRecorder. Nothing leaves the browser:
// onRecorded(file) gets a File, which takes the same path as an upload.
//   status: 'idle' | 'asking' (permission prompt) | 'countdown' | 'recording'
//   count:  seconds left in the countdown (3, 2, 1)
//   level:  0–1 input loudness during the countdown and recording, for a meter
//   seconds: time recorded so far, to a tenth
//   error:  a message for students, or null
export function useMicRecorder(onRecorded) {
  const [status, setStatus] = useState('idle')
  const [level, setLevel] = useState(0)
  const [count, setCount] = useState(COUNTDOWN_S)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState(null)
  const live = useRef(null) // { stream, recorder, context, frame, timer }
  const onRecordedRef = useRef(onRecorded)
  onRecordedRef.current = onRecorded

  const cleanup = useCallback(() => {
    const l = live.current
    if (!l) return
    cancelAnimationFrame(l.frame)
    clearInterval(l.timer)
    l.stream.getTracks().forEach((t) => t.stop()) // turns the browser's mic light off
    l.context?.close().catch(() => {})
    live.current = null
    setLevel(0)
  }, [])

  // Leaving the step mid-recording drops the recording and frees the mic.
  useEffect(
    () => () => {
      const recorder = live.current?.recorder
      if (recorder) {
        recorder.onstop = null
        if (recorder.state === 'recording') recorder.stop()
      }
      cleanup()
    },
    [cleanup],
  )

  // Stops recording (keeping what was recorded), or cancels the countdown.
  const stop = useCallback(() => {
    const recorder = live.current?.recorder
    if (recorder?.state === 'recording') return recorder.stop()
    if (live.current) {
      cleanup()
      setStatus('idle')
    }
  }, [cleanup])

  const start = useCallback(async () => {
    if (live.current) return
    setError(null)
    setSeconds(0)
    setCount(COUNTDOWN_S)
    setStatus('asking')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS)
    } catch (err) {
      setStatus('idle')
      setError(micErrorMessage(err))
      return
    }

    const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks = []
    live.current = { stream, recorder }

    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || 'audio/webm'
      cleanup()
      setStatus('idle')
      const blob = new Blob(chunks, { type })
      if (!blob.size) {
        setError('Nothing was recorded. Check your microphone and try again.')
        return
      }
      onRecordedRef.current(new File([blob], `microphone-recording.${extensionFor(type)}`, { type }))
    }
    recorder.onerror = (e) => {
      console.error('Microphone recording failed', e.error)
      recorder.onstop = null
      cleanup()
      setStatus('idle')
      setError('Recording stopped with an error. Try again, or upload a file instead.')
    }

    // The meter runs through the countdown too, so the student can check the
    // mic hears them before it counts.
    watchLevel(stream, live.current, setLevel)
    setStatus('countdown')
    const l = live.current
    const countFrom = performance.now()
    l.timer = setInterval(() => {
      const left = COUNTDOWN_S - Math.floor((performance.now() - countFrom) / 1000)
      if (left > 0) return setCount(left)
      clearInterval(l.timer)
      record(l)
    }, 100)

    function record(l) {
      const startedAt = performance.now()
      l.timer = setInterval(() => {
        const s = (performance.now() - startedAt) / 1000
        setSeconds(Math.min(MAX_MIC_S, Math.floor(s * 10) / 10))
        if (s >= MAX_MIC_S) stop()
      }, 100)
      recorder.start()
      setStatus('recording')
    }
  }, [cleanup, stop])

  return { status, count, level, seconds, error, start, stop }
}

// Drives the level meter from an AnalyserNode. Only measures: nothing is
// connected to the speakers, so there's no feedback.
function watchLevel(stream, l, setLevel) {
  try {
    const context = new AudioContext()
    const analyser = context.createAnalyser()
    analyser.fftSize = 1024
    context.createMediaStreamSource(stream).connect(analyser)
    const data = new Float32Array(analyser.fftSize)
    l.context = context
    const tick = () => {
      analyser.getFloatTimeDomainData(data)
      let peak = 0
      for (const v of data) peak = Math.max(peak, Math.abs(v))
      setLevel(Math.min(1, peak * 1.5))
      l.frame = requestAnimationFrame(tick)
    }
    tick()
  } catch (err) {
    console.error('Level meter unavailable', err) // recording still works
  }
}

function micErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'The browser didn’t allow the microphone. Click the microphone or lock icon in the address bar, allow the microphone, then try again. Or upload a file instead.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No microphone was found. Plug one in and try again, or upload a file instead.'
    case 'NotReadableError':
      return 'The microphone is busy, maybe in another app or tab. Close that, then try again.'
    default:
      console.error('Microphone failed', err)
      return 'The microphone didn’t start. Try again, or upload a file instead.'
  }
}

const extensionFor = (type) => ({ 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a' })[type.split(';')[0]] ?? 'webm'
