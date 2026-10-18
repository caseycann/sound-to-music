import { useFocusOnMount } from './useFocusOnMount.js'

// A section's numbered heading, centred in an outlined box (.step-heading in
// index.css), e.g. "Step 1: Add a sound".
//
// With `action` ({ onClick, hint, disabled }), the box is also the section's
// first button: the whole box is clickable and `hint` says what it does. The
// heading stays an <h2> around the button, so it still reads as a heading.
// A disabled action stays focusable (aria-disabled), so focus isn't lost
// while it waits.
//
// autoFocus: focus the button (or, without an action, the heading) when it
// mounts, for when it replaces whatever the student was using.
export default function StepHeading({ step, action, autoFocus = false, children }) {
  const headingRef = useFocusOnMount(autoFocus && !action)
  const title = (
    <>
      <span className="step-heading-number">Step {step}:</span> {children}
    </>
  )
  if (!action) {
    return (
      <h2 ref={headingRef} className="step-heading" tabIndex={autoFocus ? -1 : undefined}>
        {title}
      </h2>
    )
  }

  return (
    <h2 className="step-heading is-action">
      <button
        type="button"
        onClick={action.disabled ? undefined : action.onClick}
        aria-disabled={action.disabled || undefined}
        autoFocus={autoFocus}
      >
        <span className="step-heading-title">{title}</span>
        {action.hint && <span className="step-heading-hint">{action.hint}</span>}
      </button>
    </h2>
  )
}
