# Found Sound Interface

A web app for 8th and 9th graders (about ages 13–15). Students record short found sounds, describe them, and jam together with the whole class's sound library. Treat privacy as a first-class requirement: these users are minors.

> Status: joining a class, adding a sound (upload → trim → describe → save → place) and the SuperSonic engine test page are built. The class-wide field, the jam, anonymous student IDs and the Students/Jams tables are still the plan.

## Product

### Add a sound (built)
1. **Join** with a class code (`/api/join`). The code is the only thing kept in `localStorage`.
2. **Upload** a file from a field recorder and **choose up to 3 seconds**. The clip is cleaned up in the browser: mono, 44.1 kHz, 80 Hz high-pass, trimmed, faded, normalized, 16-bit WAV.
3. **Describe** it with **exactly one onomatopoeia** (e.g. "bzzt") and **exactly two descriptor words** (e.g. "buzzy", "bright"), each in its own field. Words are lowercased and trimmed, letters (including accented ones), spaces and hyphens only, max 20 characters. The rules live in `shared/words.js` and are checked in the browser and again in `/api/sounds`.
4. **Save:** `/api/sign-upload` → signed upload of the WAV straight to Cloudinary (`resource_type: video`, WAV only) → `/api/sounds` creates the Sounds record with Status **Pending** → `/api/place` asks Claude for a position.
5. **Place:** the student clicks the field where they think the sound belongs. Only then do two ghost dots appear: **Words** (Claude, from the three words) and **Sound** (the in-browser audio analysis), with Claude's one-line reason. The student can drag the dot or nudge it with the arrow keys (0.01 per press, 0.1 with Shift), then saves it with `/api/student-position`. The ghosts appear after the first click on purpose: the student commits to their own guess before comparing it with the others.
6. A success screen ends with **"Upload another"**.

### The field
Every sound is a dot on a 2D field, drawn with D3.

- **X axis:** Note (+1) to Noise (−1). Could you hum it back?
- **Y axis:** Hold (+1) to Hit (−1). Does it sustain, or end almost at once?

| Quadrant | Meaning | Region |
|---|---|---|
| **Plinks** | note + hit | x > 0, y < 0 |
| **Hums** | note + hold | x > 0, y > 0 |
| **Clicks** | noise + hit | x < 0, y < 0 |
| **Whooshes** | noise + hold | x < 0, y > 0 |

A point exactly on an axis counts as Note / Hold. `src/field/quadrants.js` is the only `quadrantOf`; don't add another.

**Coordinates:** every position (student, Claude, audio, final) is clamped to [−1, 1] and rounded to **two decimals**, using `toCoordinate` in `shared/position.js` on both client and server.

### Placement: three opinions, and the student's wins
- **Audio:** `src/audio/features.js` measures spectral flatness (Meyda), pitch clarity (autocorrelation; Meyda has no pitch extractor), attack time and sustain time (from Meyda's RMS envelope). It maps them to Audio X/Y using the weights and thresholds in `MAPPING`. Tune them with `node scripts/tune-features.mjs` against labeled clips in `tuning-clips/` (gitignored).
- **Claude:** `/api/place` sends only the three words, inside `<sound>` tags that the prompt says to treat as data. It never sends audio or features: Claude is meant to be an independent second opinion. Claude returns `x, y, confidence, needs_review, reason`. A sound with Claude X already set is never re-scored.
- **Default (blend):** if Claude's confidence ≥ 0.5, the default is the average of Claude and audio; otherwise it's the audio position, and Needs review is set. Needs review is also set when Claude flags an inappropriate word. The blend goes into Final X/Y so a sound has a dot even if the student never places it. The settings are `CLAUDE_WEIGHT` and `MIN_CONFIDENCE` in `api/_lib/placement.js`.
- **Student:** the student's spot is saved once per sound (409 after that) to Student X/Y and **replaces Final X/Y**. `/api/place` never overwrites Final X/Y once Student X is set.

### Jam (planned)
- Clicking a dot loops that sound.
- Controls: **BPM**, **pitch**, **attack**, **release**.
- **"+ Instrument"** adds another layer (another looping sound with its own controls).
- The jam can be **exported as audio**.

## Stack

- **React + Vite**, in **JavaScript**. Don't use TypeScript unless the user asks for it.
- **Vercel** for hosting. Serverless functions live in `/api`. Code used by both client and server lives in `shared/` (no secrets, no SDKs).
- **D3** for the dot field.
- **SuperSonic** (npm: `supersonic-scsynth`): SuperCollider's scsynth running in the browser through an AudioWorklet. Used for all playback and synthesis.
- **Meyda** for audio feature extraction in the browser.
- **Airtable** as the database, through the small REST wrapper in `api/_lib/airtable.js` (no Airtable SDK).
- **Cloudinary** for audio storage. **Signed uploads only.**
- **Claude API** through the official `@anthropic-ai/sdk`, called **only** from `api/place.js`. Model: `claude-haiku-5-5` (from `ANTHROPIC_MODEL`). Guaranteed JSON comes from structured outputs (`output_config.format` with a JSON schema). Haiku 5.5 rejects any non-default `temperature` (400), so don't set one; use `output_config.effort: "low"` and leave `max_tokens` room for thinking (1024). The schema can't express min/max, so validate and clamp ranges on the server.

## Rules (non-negotiable)

1. **Secrets never reach the browser.** Client code (`src/`) may only read `import.meta.env.VITE_*` variables, and no `VITE_` variable may hold a secret. Never import Airtable, Cloudinary-admin, or Anthropic SDKs into `src/`. Anything that needs a secret goes in an `/api` function.
2. **Every `/api` function validates an active class code before doing anything else.** Look the code up in `Classes`, check that it is active, and return 401/403 if it isn't. Use the shared helper `api/_lib/auth.js` (wrap the handler in `withClass`, or call `requireClass` first); don't reimplement the check in each endpoint. Endpoints that take a `soundId` load it with `getClassSound` (`api/_lib/sounds.js`), which returns 404 for a sound from another class. **Only exception:** `api/health.js`, which touches no data and returns just `{ ok: true }`.
3. **No student names.** Don't store names, emails, or any other PII. Each student has an anonymous ID (`crypto.randomUUID()`) kept in `localStorage`.
4. **One session per student.** Each student runs their own session. A sound can be used **once per student session**. Track this in React state, not in Airtable or `localStorage`.
5. **Opted-out students can't record.** A student flagged "opted out of recording" can still play and export but cannot record. Enforce this in both places: the UI hides recording, and the upload-signing endpoint refuses the request.
6. **Small components.** Keep each component focused on one job. Split a component when it grows.
7. **One door to SuperSonic.** All SuperSonic access goes through a single React context (planned: `AudioEngineProvider` + `useAudioEngine()`). No component imports `supersonic-scsynth` directly.
8. **Cloudinary uploads are signed.** The browser asks `/api/sign-upload` for a signature, then uploads directly to Cloudinary. Never create or use an unsigned upload preset.
9. **After any change, tell the user exactly how to test it by hand:** the commands to run, the URL to open, what to click, and what they should see.

## Commands

- `vercel dev`: run the app locally at http://localhost:3000. Use this, not `npm run dev`; Vite alone doesn't serve `/api`.
- `npm test`: Vitest unit tests (`*.test.js` next to the code).
- `node scripts/setup-airtable.mjs`: create the Classes and Sounds tables, or add any missing fields, and seed the `TEST01` class. Safe to re-run; it never changes or removes existing fields.
- `node scripts/tune-features.mjs [folder]`: show where each labeled clip (`plinks-*.wav`, `hums-*.wav`, …) lands.

## Layout

```
shared/              rules used by both src/ and api/ (words.js, position.js)
src/
  components/        small UI components
    uploader/        pick a file, choose up to 3 s, preview the clip
    describe/        the three-word form and the success screen
    place/           the student places their sound; ghost dots and key
  audio/             SuperSonic provider, clip processing, Meyda features
  field/             D3 field pieces (FieldFrame, FieldDot, scale, quadrants, placement hook)
  session/           class code join and storage
  sound/             saveSound.js: sign → upload → record → place, and saving the student's spot
api/
  _lib/              auth, airtable, cloudinary, placement (prompt, schema, blend), sounds
  join.js            check a class code
  sign-upload.js     Cloudinary upload signature
  sounds.js          create a Sounds record (Status Pending)
  place.js           Claude Haiku placement (the only Claude call)
  student-position.js  save the student's spot (once per sound)
  health.js          liveness, no class check
scripts/             Airtable setup, feature tuning, SuperSonic asset copy
```

## Data model

Field names below are the real Airtable names. They must match **exactly, including capitalization**: Airtable rejects unknown field names with a 422 error, and the setup script compares names case-insensitively, so it won't catch a case mismatch. Check the base before adding a field.

- **Classes:** Code, Name, Teacher, Active (checkbox), Sounds (link)
- **Sounds:** Onomatopoeia, Descriptor 1, Descriptor 2, Source File Name, Cloudinary ID, Audio URL, Duration, Class (link to Classes), Audio X, Audio Y, Claude X, Claude Y, Confidence, Needs review (checkbox), Reason, Student X, Student Y, Final X, Final Y, Status (Pending / Approved / Rejected)
- **Students** (planned): anonId, classCode, optedOutOfRecording
- **Jams** (planned): anonId, classCode, layers (JSON), exportUrl

Airtable quirk: fetching a record ID that doesn't exist returns **403** (`INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND`), not 404. `getRecord` treats both as "not found".

## Open items

- **Rule 5 isn't enforced yet.** There's no Students table or anonymous ID, so `/api/sign-upload` can't refuse opted-out students. See its `TODO(rule 5)`.
- **Source File Name may contain PII** (e.g. `maya-recording.wav`). Decide whether to store only the extension, or nothing.
- **Orphaned uploads:** if `/api/sounds` fails after the Cloudinary upload, the WAV stays in Cloudinary with no record.
- **Whooshes are hard to reach from the audio alone.** Gain doesn't affect the features, but:
  - flatness around 0.04 (typical breath on a real mic) scores toward Note;
  - the Hold thresholds were set by a hum;
  - the silence trim uses an absolute −45 dBFS before normalizing, which clips a quiet whoosh's fade-in.

  Fixes under consideration: trim relative to the clip's peak, and re-tune `MAPPING` once there are more `whooshes-*.wav` tuning clips.
- **Blend ideas not yet adopted:** a sliding Claude weight instead of the 0.5 confidence cutoff, separate weights per axis (Claude stronger on X, audio stronger on Y), and more whoosh reference points in the prompt.

## Check when building

- **Cross-origin isolation:** SuperSonic may need `SharedArrayBuffer`, which requires COOP/COEP headers in both `vite.config.js` (dev) and `vercel.json` (prod). If you turn those headers on, Cloudinary audio has to be fetched with CORS. Read the `supersonic-scsynth` docs before deciding.
- **Export:** decide whether to capture the AudioWorklet output (e.g. MediaStreamDestination + MediaRecorder) or render offline.
- **Claude API details change:** check the current docs (model IDs, structured outputs, which parameters each model accepts) before changing `api/place.js`; don't rely on memory.

## Environment variables

All of these are server-only. They are read in `/api` and never in `src/`. Local values go in `.env.local`, which is gitignored. `.env.example` lists the names.

| Name | Description |
|---|---|
| `AIRTABLE_PAT` | Airtable personal access token with read/write access to the base (plus schema read/write for the setup script). |
| `AIRTABLE_BASE_ID` | ID of the Airtable base that holds Classes, Students, Sounds, and Jams. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name. Sent to the client by `/api/sign-upload`. |
| `CLOUDINARY_API_KEY` | Cloudinary API key included in the signed upload parameters. Not secret; sent to the client. |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret used to sign uploads. **Secret.** |
| `CLOUDINARY_UPLOAD_FOLDER` | Cloudinary folder that uploads go into (default `found-sound`). `/api/sounds` only accepts public IDs inside it. |
| `ANTHROPIC_API_KEY` | Claude API key, used only by `/api/place`. **Secret.** |
| `ANTHROPIC_MODEL` | Model ID for placement (default `claude-haiku-5-5`). |

No `VITE_` variables are needed yet. If you add one, it must be safe for anyone to see.
