// 75.25 -> "1:15.3"
export function formatTime(seconds) {
  const tenths = Math.round(seconds * 10)
  const minutes = Math.floor(tenths / 600)
  const rest = ((tenths % 600) / 10).toFixed(1).padStart(4, '0')
  return `${minutes}:${rest}`
}
