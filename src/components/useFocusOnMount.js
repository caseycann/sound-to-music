import { useEffect, useRef } from 'react'

// Moves keyboard focus to the returned ref's element when it mounts. Use it
// where a step replaces the button the student just pressed (which would
// otherwise drop focus to the top of the page). A non-interactive target
// needs tabIndex={-1}.
export function useFocusOnMount(enabled = true) {
  const ref = useRef(null)
  useEffect(() => {
    if (enabled) ref.current?.focus({ preventScroll: false })
  }, [enabled])
  return ref
}
