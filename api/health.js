// Liveness check. The one documented exception to the class-code rule in
// CLAUDE.md: it touches no data and exposes nothing.
export default function handler(req, res) {
  res.status(200).json({ ok: true })
}
