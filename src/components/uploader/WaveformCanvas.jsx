import { useEffect, useMemo, useRef } from 'react'
import { computePeaks } from '../../audio/waveform.js'

const COLUMNS = 800
const HEIGHT = 96

// Draws [view.start, view.end) of the channels. `scale` multiplies the drawn
// height, so quiet recordings are still visible.
export default function WaveformCanvas({ channels, sampleRate, view, scale = 1 }) {
  const canvasRef = useRef(null)
  const startFrame = Math.floor(view.start * sampleRate)
  const endFrame = Math.ceil(view.end * sampleRate)
  const peaks = useMemo(
    () => computePeaks(channels, startFrame, endFrame, COLUMNS),
    [channels, startFrame, endFrame],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const mid = HEIGHT / 2
    context.clearRect(0, 0, COLUMNS, HEIGHT)
    context.fillStyle = getComputedStyle(canvas).color
    for (let col = 0; col < COLUMNS; col++) {
      const top = mid - Math.min(1, peaks[col * 2 + 1] * scale) * mid
      const bottom = mid - Math.max(-1, peaks[col * 2] * scale) * mid
      context.fillRect(col, top, 1, Math.max(1, bottom - top))
    }
  }, [peaks, scale])

  return <canvas ref={canvasRef} className="waveform-canvas" width={COLUMNS} height={HEIGHT} aria-hidden="true" />
}
