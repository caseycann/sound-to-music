import { useRef } from 'react'
import WaveformCanvas from './WaveformCanvas.jsx'
import { formatTime } from './formatTime.js'
import { useSelectionDrag } from './useSelectionDrag.js'

// A waveform of `view` with the selection drawn over it. Drag the window to
// move it, drag its edges to resize it, or press anywhere to jump there.
export default function WaveformSelector({ label, channels, sampleRate, scale, duration, view, selection, onChange }) {
  const trackRef = useRef(null)
  const { shownView, beginDrag, keyDown, trackHandlers } = useSelectionDrag({
    trackRef, view, selection, duration, onChange,
  })
  const span = shownView.end - shownView.start
  const percent = (time) => `${((time - shownView.start) / span) * 100}%`

  const slider = (edge, name, valueText = formatTime(selection[edge])) => ({
    role: 'slider',
    tabIndex: 0,
    'aria-label': `${label}: ${name}`,
    'aria-valuemin': 0,
    'aria-valuemax': duration,
    'aria-valuenow': selection[edge],
    'aria-valuetext': valueText,
  })

  return (
    <div className="waveform">
      <div className="waveform-label">{label}</div>
      <div className="waveform-track" ref={trackRef} {...trackHandlers}>
        <WaveformCanvas channels={channels} sampleRate={sampleRate} view={shownView} scale={scale} />
        <div
          className="waveform-selection"
          style={{ left: percent(selection.start), width: percent(shownView.start + selection.end - selection.start) }}
          onPointerDown={beginDrag('move')}
          onKeyDown={keyDown('move')}
          {...slider('start', 'move selection', `${formatTime(selection.start)} to ${formatTime(selection.end)}`)}
        >
          <div className="waveform-handle start" onPointerDown={beginDrag('start')} onKeyDown={keyDown('start')} {...slider('start', 'selection start')} />
          <div className="waveform-handle end" onPointerDown={beginDrag('end')} onKeyDown={keyDown('end')} {...slider('end', 'selection end')} />
        </div>
      </div>
    </div>
  )
}
