# Found Sound Interface

A web app for 8th and 9th graders (about ages 13–15). Students record short found sounds, describe them, and jam together with the whole class's sound library. Treat privacy as a first-class requirement: these users are minors.

> Status: joining a class, adding a sound (upload → trim → describe → save → place), the teacher review page, the SuperSonic engine test page (`?debug` only), the class library on the field and looping tracks in the jam are built. Jam export in the student UI, saving recipes, anonymous student IDs and the Students/Jams tables are still the plan.

## Product

### Add a sound (built)
1. **Join** with a class code (`/api/join`). The code is the only thing kept in `localStorage`.
2. **Upload** a file from a field recorder and **choose up to 3 seconds**. The clip is cleaned up in the browser: mono, 44.1 kHz, 80 Hz high-pass, trimmed, faded, normalized, 16-bit WAV.
3. **Describe** it with **exactly one onomatopoeia** (e.g. "bzzt") and **exactly two descriptor words** (e.g. "buzzy", "bright"), each in its own field. Words are lowercased and trimmed, letters (including accented ones), spaces and hyphens only, max 20 characters. The rules live in `shared/words.js` and are checked in the browser and again in `/api/sounds`.
4. **Save:** `/api/sign-upload` → signed upload of the WAV straight to Cloudinary (`resource_type: video`, WAV only) → `/api/sounds` creates the Sounds record with Status **Pending** → `/api/place` asks Claude for a position and sets Status to **Approved** unless Needs review is set (`placedStatus` in `api/_lib/placement.js`). Only flagged sounds wait for the teacher; a teacher's Approved/Rejected is never changed.
5. **Place:** the student clicks the field where they think the sound belongs. Only then do two ghost dots appear: **Words** (Claude, from the three words) and **Sound** (the in-browser audio analysis), with Claude's one-line reason. The student can drag the dot or nudge it with the arrow keys (0.01 per press, 0.1 with Shift), then saves it with `/api/student-position`. The ghosts appear after the first click on purpose: the student commits to their own guess before comparing it with the others.
6. A success screen ends with **"Upload another"**.

### Teacher review (built)
`/review` (no class code needed). The teacher enters `TEACHER_PIN`; `/api/teacher-login` checks it on the server (5 wrong tries lock that IP out for 15 minutes, per serverless instance) and returns a token signed with `TEACHER_TOKEN_SECRET` that lasts 2 hours, kept in `sessionStorage`. Changing the PIN invalidates every token. The page lists Pending sounds from every class (flagged ones, and any that were never placed), Needs review first, with Play, Approve and Reject; `/api/review` sets Status. `vercel.json` rewrites `/review` to `index.html`; the app has no router.

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

A point exactly on an axis counts as Note / Hold. `shared/quadrants.js` is the only `quadrantOf`; don't add another.

**Two field components:** `FieldFrame` (fixed 400×400 viewBox, used by the place step) and `DotField` (`src/field/DotField.jsx`, used by the Jam). `DotField` takes `sounds`, `usedIds` (a Set: faded, skipped by Tab, can't be picked), `states` (`loading` / `error` per id) and `onPick`. React draws the layers and fixed labels; `useDotField` does the D3 part (scales, d3-zoom up to 8×, the data join). Each dot sits at Final X/Y plus a jitter of ±0.02 seeded from its id that never crosses an axis, and drifts at most 3 px with a CSS animation (off under `prefers-reduced-motion`). Tab goes in reading order; a focused dot outside the zoomed view is panned into view. The seeded rules are in `src/field/dotField.js`.

**Coordinates:** every position (student, Claude, audio, final) is clamped to [−1, 1] and rounded to **two decimals**, using `toCoordinate` in `shared/position.js` on both client and server.

### Placement: three opinions, and the student's wins
- **Audio:** `src/audio/features.js` measures spectral flatness (Meyda), pitch clarity (autocorrelation; Meyda has no pitch extractor), attack time and sustain time (from Meyda's RMS envelope). It maps them to Audio X/Y using the weights and thresholds in `MAPPING`. Tune them with `node scripts/tune-features.mjs` against labeled clips in `tuning-clips/` (gitignored).
- **Claude:** `/api/place` sends only the three words, inside `<sound>` tags that the prompt says to treat as data. It never sends audio or features: Claude is meant to be an independent second opinion. Claude returns `x, y, confidence, needs_review, reason`. A sound with Claude X already set is never re-scored.
- **Default (blend):** if Claude's confidence ≥ 0.5, the default is the average of Claude and audio; otherwise it's the audio position, and Needs review is set. Needs review is also set when Claude flags an inappropriate word. The blend goes into Final X/Y so a sound has a dot even if the student never places it. The settings are `CLAUDE_WEIGHT` and `MIN_CONFIDENCE` in `api/_lib/placement.js`.
- **Student:** the student's spot is saved once per sound (409 after that) to Student X/Y and **replaces Final X/Y**. `/api/place` never overwrites Final X/Y once Student X is set.

### Class library (built)
After Start, the Jam section fetches `/api/library` (GET, class code in the `X-Class-Code` header): every Approved sound in the caller's class with id, onomatopoeia, descriptors, Cloudinary's WAV delivery URL (built from Cloudinary ID), Final X/Y and quadrant. The server caches each class's library in memory for 5 minutes (per serverless instance) and sends `Cache-Control: private, max-age=300`; `private` keeps it out of Vercel's shared CDN, since the answer depends on a header. So an approval can take up to ~10 minutes to show.

Samples load **lazily, on first click**, not all at Start: the library has no size limit, SuperSonic allows 1024 buffers by default (`numBuffers`), and each 3 s clip decodes to ~576 KB of float32. `src/audio/samplePool.js` hands out buffers 16–143 (128 slots, ~74 MB) and unloads the least recently used sound when full, never one a track is looping or one still loading. Buffers 0 (test sound) and 1 (upload preview) are reserved.

### Jam (built, except export)
The field sits beside a **track panel** (`src/components/jam/`).

- **Picking:** while the field is *picking* (no tracks yet, or after **"+ Instrument"**, which outlines the field), a pick loads the sound, adds a Track for it, marks it used, and starts the shared bar clock; the track comes in on the next bar. Otherwise a click just plays the sound once, to audition it (doesn't use it up). The rules are in `useJamPicks.js`.
- **At most 8 tracks** (`MAX_TRACKS`). Removing a track asks first and does **not** return its sound to the field: `usedIds` only grows (rule 4).
- **4-bar loop:** each track has four bar buttons (`bars`, all on by default; `LOOP_BARS` in `limits.js`). The bar clock numbers every bar from 0 at Play, including bars it skips when a background tab is throttled, and a track only fires in the bars that are on. The bar now sounding is outlined (`currentBar` from the provider). Tracks added mid-loop join wherever the loop is.
- **Start** (per track, `offset`): where in the bar the track first sounds, in quarter beats after the bar line (`OFFSET` in `limits.js`: 0 = beat 1, up to 3.75 = beat 4¾). Stored in beats, so it stays put when the BPM changes. Hits after the bar line are sent as their own timed bundles.
- **Loop whole bar** (per track, `loop`): off, the sample plays once at the bar line and may ring into the next bar; on, it restarts each time it ends from the Start point and is cut at the bar line with a 10 ms fade (`barPasses` in `tracks.js`, at most 64 passes a bar). The later passes are sent as timed bundles when the bar is scheduled.
- **Panel:** global **BPM** and **Play all / Stop all**; per track: the onomatopoeia, **Mute**, **Loop whole bar**, **Remove**, the four bar buttons, and **start**, **pitch** (semitones), **attack**, **release**, **volume**, **cutoff** and **reverb** sliders. Cutoff and reverb change what is sounding at once (`/n_set` on the track's group, 50 ms glide); the other sliders are heard from the track's next bar. Mute and Remove fade the track out at once.
- **State:** the whole jam is one reducer, `jamReducer` in `src/audio/jam.js`: `{ bpm, tracks, usedIds }`, with values clamped to `limits.js`. `toRecipe(jam)` gives what a saved recipe would hold (BPM and each track's soundId and settings, no buffer numbers). The provider keeps it with `useJam`, whose ref updates on dispatch so the bar clock sees a new track before the next render.
- **Engine:** each track's synths go in their own scsynth group (`trackGroups.js`, 101–999) inside `LOOP_GROUP`, so one track can be faded and freed alone. The group holds the track's players, which write to the track's own stereo bus (16, 18, …), and at its tail a `sonic-pi-fx_reverb` that reads that bus and writes to the speakers; `mix` is the Reverb slider (0 = dry) and the room size is `REVERB_ROOM`. Cutoff is the players' `lpf` (a MIDI note, 40–130; the filter is always on, since 0 would switch it off and a glide from 0 would sweep). Mute and Remove free the track's group, which also cancels loop passes already sent for that bar (scsynth logs "Group not found" for them); the track gets a new group and reverb the next time it plays. Stop purges, frees every track group with `/g_freeAll`, and forgets them.
- **Export** (planned for students): `recordBars` already exists and is on the `?debug` test page.

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
2. **Every `/api` function validates an active class code before doing anything else.** Look the code up in `Classes`, check that it is active, and return 401/403 if it isn't. Use the shared helper `api/_lib/auth.js` (wrap the handler in `withClass`, or call `requireClass` first); don't reimplement the check in each endpoint. Endpoints that take a `soundId` load it with `getClassSound` (`api/_lib/sounds.js`), which returns 404 for a sound from another class. **Exceptions:** `api/health.js`, which touches no data and returns just `{ ok: true }`; and the teacher endpoints `api/teacher-login.js` (checks `TEACHER_PIN`) and `api/review.js` (works across classes, so it takes a teacher token through `withTeacher` in `api/_lib/teacher.js` instead of a class code).
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
- `node --env-file=.env.local scripts/approve-unflagged.mjs [--apply]`: one-off backfill that gives already-placed sounds the Status `/api/place` would give them now. Dry run without `--apply`.
- `node scripts/tune-features.mjs [folder]`: show where each labeled clip (`plinks-*.wav`, `hums-*.wav`, …) lands.

## Layout

```
shared/              rules used by both src/ and api/ (words.js, position.js, quadrants.js)
src/
  components/        small UI components
    uploader/        pick a file, choose up to 3 s, preview the clip
    describe/        the three-word form and the success screen
    place/           the student places their sound; ghost dots and key
  audio/             SuperSonic provider, jam reducer, track groups, clip processing, Meyda features
  field/             D3 field pieces (FieldFrame, FieldDot, scale, placement hook; DotField for the Jam)
  session/           class code join and storage
  review/            teacher /review page: PIN form, pending list, approve/reject
  library/           fetch the class library; load its samples on first click
  components/jam/    Jam section: the library on a DotField, the track panel, picking rules
  sound/             saveSound.js: sign → upload → record → place, and saving the student's spot
api/
  _lib/              auth, airtable, cloudinary, placement (prompt, schema, blend), sounds, library (cache)
  join.js            check a class code
  sign-upload.js     Cloudinary upload signature
  sounds.js          create a Sounds record (Status Pending)
  place.js           Claude Haiku placement (the only Claude call)
  student-position.js  save the student's spot (once per sound)
  teacher-login.js   TEACHER_PIN -> signed teacher token
  review.js          list Pending sounds, set Approved / Rejected (teacher token)
  library.js         the class's Approved sounds (cached 5 min)
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

All of these are server-only. They are read in `/api` and never in `src/`. `.env.example` lists the names. The project is linked to Vercel, and `vercel dev` uses the Development variables stored in Vercel, not `.env.local`: add every new variable with `vercel env add NAME development` (and `production`), then restart `vercel dev`. `.env.local` (gitignored) is still handy for scripts run with `node --env-file=.env.local`.

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
| `TEACHER_PIN` | PIN for `/review`. **Secret.** Use 8+ characters. |
| `TEACHER_TOKEN_SECRET` | Random string that signs teacher tokens. **Secret.** |

No `VITE_` variables are needed yet. If you add one, it must be safe for anyone to see.
