# Found Sound Interface

A web app for 8th and 9th graders (about ages 13–15). Students record short found sounds, describe them, and jam together with the whole class's sound library. Treat privacy as a first-class requirement: these users are minors.

> Status: no app code yet. The layout and data model below are the plan, not a description of existing files.

## Product

### Record
- A student joins with a class code, uploads a file from their field recorder, chooses up to 3 seconds of it, and adds one onomatopoeia and two descriptors.
- Claude and in-browser audio analysis place it on the field: Plinks (note + hit), Hums (note + hold), Clicks (noise + hit), Whooshes (noise + hold).
- The student describes the sound with **exactly one onomatopoeia** (e.g. "bzzt") and **exactly two descriptor words** (e.g. "buzzy", "bright").

### The field
Every sound is a dot on a 2D field, drawn with D3.

- **X axis:** Note (+1) to Noise (−1)
- **Y axis:** Hold (+1) to Hit (−1)

| Quadrant | Meaning | Region |
|---|---|---|
| **Plinks** | note + hit | x > 0, y < 0 |
| **Hums** | note + hold | x > 0, y > 0 |
| **Clicks** | noise + hit | x < 0, y < 0 |
| **Whooshes** | noise + hold | x < 0, y > 0 |

**Placement:** Meyda extracts audio features in the browser. The client sends those features and the three words to `/api/place`. That endpoint asks Claude (Haiku) for coordinates and returns `{ x, y }`, each clamped to [−1, 1].

### Jam
- Clicking a dot loops that sound.
- Controls: **BPM**, **pitch**, **attack**, **release**.
- **"+ Instrument"** adds another layer (another looping sound with its own controls).
- The jam can be **exported as audio**.

## Stack

- **React + Vite**, in **JavaScript**. Don't use TypeScript unless the user asks for it.
- **Vercel** for hosting. Serverless functions live in `/api`.
- **D3** for the dot field.
- **SuperSonic** (npm: `supersonic-scsynth`): SuperCollider's scsynth running in the browser through an AudioWorklet. Used for all playback and synthesis.
- **Meyda** for audio feature extraction in the browser.
- **Airtable** as the database. Tables: `Classes`, `Students`, `Sounds`, `Jams`.
- **Cloudinary** for audio storage. **Signed uploads only.**
- **Claude API** with a Haiku model, used for placing sounds on the field. Called **only** from `/api/place`.

## Rules (non-negotiable)

1. **Secrets never reach the browser.** Client code (`src/`) may only read `import.meta.env.VITE_*` variables, and no `VITE_` variable may hold a secret. Never import Airtable, Cloudinary-admin, or Anthropic SDKs into `src/`. Anything that needs a secret goes in an `/api` function.
2. **Every `/api` function validates an active class code before doing anything else.** Look the code up in `Classes`, check that it is active, and return 401/403 if it isn't. Use one shared helper (planned: `api/_lib/requireClass.js`); don't reimplement the check in each endpoint. **Only exception:** `api/health.js`, which touches no data and returns just `{ ok: true }`.
3. **No student names.** Don't store names, emails, or any other PII. Each student has an anonymous ID (`crypto.randomUUID()`) kept in `localStorage`.
4. **One session per student.** Each student runs their own session. A sound can be used **once per student session**. Track this in React state, not in Airtable or `localStorage`.
5. **Opted-out students can't record.** A student flagged "opted out of recording" can still play and export but cannot record. Enforce this in both places: the UI hides recording, and the upload-signing endpoint refuses the request.
6. **Small components.** Keep each component focused on one job. Split a component when it grows.
7. **One door to SuperSonic.** All SuperSonic access goes through a single React context (planned: `AudioEngineProvider` + `useAudioEngine()`). No component imports `supersonic-scsynth` directly.
8. **Cloudinary uploads are signed.** The browser asks `/api/sign-upload` for a signature, then uploads directly to Cloudinary. Never create or use an unsigned upload preset.
9. **After any change, tell the user exactly how to test it by hand:** the commands to run, the URL to open, what to click, and what they should see.

## Planned layout

```
src/
  components/        small UI components
  audio/             AudioEngine context (the only SuperSonic access), recorder, Meyda helpers
  field/             D3 dot field
api/
  _lib/              shared server helpers (requireClass, airtable, cloudinary)
  place.js           Claude Haiku placement
  sign-upload.js     Cloudinary upload signature
  ...                one file per endpoint
```

## Data model (draft; confirm against the real Airtable base)

- **Classes:** code, active
- **Students:** anonId, classCode, optedOutOfRecording
- **Sounds:** anonId, classCode, cloudinaryUrl, onomatopoeia, descriptor1, descriptor2, x, y, features
- **Jams:** anonId, classCode, layers (JSON), exportUrl

## Check when building

- **Cross-origin isolation:** SuperSonic may need `SharedArrayBuffer`, which requires COOP/COEP headers in both `vite.config.js` (dev) and `vercel.json` (prod). If you turn those headers on, Cloudinary audio has to be fetched with CORS. Read the `supersonic-scsynth` docs before deciding.
- **Export:** decide whether to capture the AudioWorklet output (e.g. MediaStreamDestination + MediaRecorder) or render offline.

## Environment variables

All of these are server-only. They are read in `/api` and never in `src/`. Local values go in `.env.local`, which is gitignored. `.env.example` lists the names.

| Name | Description |
|---|---|
| `AIRTABLE_PAT` | Airtable personal access token with read/write access to the base. |
| `AIRTABLE_BASE_ID` | ID of the Airtable base that holds Classes, Students, Sounds, and Jams. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name. Sent to the client by `/api/sign-upload`. |
| `CLOUDINARY_API_KEY` | Cloudinary API key included in the signed upload parameters. |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret used to sign uploads. **Secret.** |
| `CLOUDINARY_UPLOAD_FOLDER` | Cloudinary folder that uploads go into (e.g. `found-sound`). |
| `ANTHROPIC_API_KEY` | Claude API key, used only by `/api/place`. **Secret.** |
| `ANTHROPIC_MODEL` | Haiku model ID for placement (e.g. `claude-haiku-5-5`). |

No `VITE_` variables are needed yet. If you add one, it must be safe for anyone to see.
