// One end of an axis beside the field. Hovering it, or focusing it from the
// keyboard, shows its tip in the box under the field (AxisTips); it is a tab
// stop so keyboard users can read the tip too. Escape hides the tip.
//   tip: the shared useAxisTip() state
export default function AxisLabel({ end, tipId, tip, children }) {
  return (
    <span className={`dot-field-axis is-${end}`}>
      <span
        className="tip-trigger"
        tabIndex={0}
        aria-describedby={tipId}
        onMouseEnter={() => tip.show(end)}
        onMouseLeave={tip.hideSoon}
        onFocus={(e) => {
          if (e.target.matches(':focus-visible')) tip.show(end)
        }}
        onBlur={tip.hide}
        onKeyDown={(e) => {
          if (e.key === 'Escape') tip.hide()
        }}
      >
        {children}
      </span>
    </span>
  )
}
