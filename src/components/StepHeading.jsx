// A section's numbered heading, centred in an outlined box (.step-heading in
// index.css), e.g. "Step 1: Add a sound".
//
// With `action` ({ onClick, hint, disabled }), the box is also the section's
// first button: the whole box is clickable and `hint` says what it does. The
// heading stays an <h2> around the button, so it still reads as a heading.
export default function StepHeading({ step, action, children }) {
  const title = (
    <>
      <span className="step-heading-number">Step {step}:</span> {children}
    </>
  )
  if (!action) return <h2 className="step-heading">{title}</h2>

  return (
    <h2 className="step-heading is-action">
      <button type="button" onClick={action.onClick} disabled={action.disabled}>
        <span className="step-heading-title">{title}</span>
        {action.hint && <span className="step-heading-hint">{action.hint}</span>}
      </button>
    </h2>
  )
}
