// Styles for the section headings (h2), defined in index.css. The style is
// a data-heading attribute on <html>; with none, headings use "neon".
// ?heading=stripe in the URL picks one at load; with ?debug, a picker
// switches it live. Not saved: only the class code goes in localStorage.
export const HEADING_STYLES = ['neon', 'stripe', 'outline', 'dots']

export function currentHeadingStyle() {
  return document.documentElement.dataset.heading ?? 'neon'
}

export function setHeadingStyle(style) {
  if (HEADING_STYLES.includes(style)) document.documentElement.dataset.heading = style
}

export function applyHeadingStyleFromUrl() {
  setHeadingStyle(new URLSearchParams(window.location.search).get('heading'))
}
