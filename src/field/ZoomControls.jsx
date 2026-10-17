// Zoom buttons for DotField. The wheel / trackpad and dragging also zoom and pan.
export default function ZoomControls({ zoomed, canZoomIn, onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="zoom-controls" role="group" aria-label="Zoom">
      <button type="button" onClick={onZoomIn} disabled={!canZoomIn} aria-label="Zoom in">+</button>
      <button type="button" onClick={onZoomOut} disabled={!zoomed} aria-label="Zoom out">−</button>
      <button type="button" onClick={onReset} disabled={!zoomed}>Reset</button>
    </div>
  )
}
