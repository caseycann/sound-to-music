// The four regions of the field (see CLAUDE.md). X: Note (+1) to Noise (-1).
// Y: Hold (+1) to Hit (-1).

export const QUADRANTS = [
  { name: 'Hums', x: 1, y: 1 },
  { name: 'Plinks', x: 1, y: -1 },
  { name: 'Whooshes', x: -1, y: 1 },
  { name: 'Clicks', x: -1, y: -1 },
]

// Points on an axis (x or y exactly 0) count as Note / Hold.
export function quadrantOf(x, y) {
  const sx = x >= 0 ? 1 : -1
  const sy = y >= 0 ? 1 : -1
  return QUADRANTS.find((q) => q.x === sx && q.y === sy).name
}
