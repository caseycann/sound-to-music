// Copies SuperSonic's runtime files from node_modules into public/supersonic/
// so Vite serves them in dev and bundles them into dist/ for Vercel. Runs
// automatically before `npm run dev` and `npm run build`.
//
// Resulting layout (matches the URLs in src/audio/SuperSonicProvider.jsx):
//   public/supersonic/workers/      client IO workers   (supersonic-scsynth)
//   public/supersonic/core/wasm/    scsynth WASM        (supersonic-scsynth-core)
//   public/supersonic/core/workers/ AudioWorklet script (supersonic-scsynth-core)
//   public/supersonic/synthdefs/    .scsyndef files     (supersonic-scsynth-synthdefs)
//
// Usage: node scripts/copy-supersonic.mjs

import { cpSync, rmSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const modules = new URL('node_modules/', root)
const out = new URL('public/supersonic/', root)

const copies = [
  ['supersonic-scsynth/dist/workers/', 'workers/'],
  ['supersonic-scsynth-core/wasm/', 'core/wasm/'],
  ['supersonic-scsynth-core/workers/', 'core/workers/'],
  ['supersonic-scsynth-synthdefs/synthdefs/', 'synthdefs/'],
]

rmSync(out, { recursive: true, force: true })
for (const [from, to] of copies) {
  cpSync(new URL(from, modules), new URL(to, out), { recursive: true })
}
console.log('Copied SuperSonic files to public/supersonic/')
