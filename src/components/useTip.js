import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

const GAP = 12 // between the box and the tip
const MARGIN = 8 // from the window's edges
const HIDE_DELAY = 150 // ms, so the pointer can move from the word onto the tip
// The box a tip sits beside: the instrument's row, else the track panel (BPM).
const ANCHOR = '.track-row, .track-panel'

// Only one tip is open at a time: opening one closes the last.
let closeOpen = null

// A tip for a control, shown while the pointer is over its trigger (the
// control's label word, not the control) or the tip itself, and while the
// control has keyboard focus (:focus-visible, so not after a mouse click).
// Escape hides it. Screen readers get it through aria-describedby={tipId}
// even while it is hidden.
//
// The tip is position: fixed, outside the trigger's instrument box, so it
// never covers the box and the scrolling track panel can't clip it: to the
// right of the box and level with the word, else to the left, else below the
// box, else above it, whichever first fits in the window. Scrolling hides
// it, since it wouldn't follow. (The field's axis tips use their own box
// under the field: AxisTips.jsx.)
export function useTip() {
  const tipId = useId()
  const triggerRef = useRef(null)
  const tipRef = useRef(null)
  const hideTimer = useRef(null)
  const [open, setOpen] = useState(false)

  const hide = () => {
    clearTimeout(hideTimer.current)
    setOpen(false)
  }
  const show = () => {
    clearTimeout(hideTimer.current)
    if (closeOpen && closeOpen !== hide) closeOpen()
    closeOpen = hide
    setOpen(true)
  }
  const hideSoon = () => {
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY)
  }

  useLayoutEffect(() => {
    if (open && triggerRef.current && tipRef.current) place(triggerRef.current, tipRef.current)
  }, [open])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [open])

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  return {
    tipId,
    triggerProps: { ref: triggerRef, className: 'tip-trigger', onMouseEnter: show, onMouseLeave: hideSoon },
    // Spread on the control, or on a group around several (focus events bubble).
    controlProps: {
      onFocus: (e) => {
        if (e.target.matches(':focus-visible')) show()
      },
      onBlur: hide,
      onKeyDown: (e) => {
        if (e.key === 'Escape') hide()
      },
    },
    tipProps: {
      id: tipId,
      ref: tipRef,
      role: 'tooltip',
      className: open ? 'tip is-open' : 'tip',
      onMouseEnter: show,
      onMouseLeave: hideSoon,
    },
  }
}

function place(trigger, tip) {
  const word = trigger.getBoundingClientRect()
  const box = (trigger.closest(ANCHOR) ?? trigger).getBoundingClientRect()
  const t = tip.getBoundingClientRect()
  const maxLeft = window.innerWidth - MARGIN - t.width
  const maxTop = window.innerHeight - MARGIN - t.height
  const clampTop = (top) => Math.max(MARGIN, Math.min(top, maxTop))
  const clampLeft = (left) => Math.max(MARGIN, Math.min(left, maxLeft))

  const right = box.right + GAP
  const left = box.left - GAP - t.width
  const below = box.bottom + GAP
  const above = box.top - GAP - t.height
  let pos
  if (right <= maxLeft) pos = { left: right, top: clampTop(word.top) }
  else if (left >= MARGIN) pos = { left, top: clampTop(word.top) }
  else if (below <= maxTop) pos = { left: clampLeft(box.left), top: below }
  else if (above >= MARGIN) pos = { left: clampLeft(box.left), top: above }
  else pos = { left: clampLeft(right), top: clampTop(word.top) } // nothing fits: as close as it can

  tip.style.top = `${pos.top}px`
  tip.style.left = `${pos.left}px`
}
