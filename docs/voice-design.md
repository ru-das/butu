# Butu audio — elevenlabs.io (free-profile revision)

User-approved revision, 2026-10-30: remove Voice Design and other paid-only
dependencies across the audio plan. V1 now selects an existing adult voice using
standard TTS. V2 now bundles an original locally rendered music box. V4–V7
remain implementation tasks; stage playback and session TTS are not yet wired.

**Later user-directed manual workflow:** the user chose to create a fictional
childlike companion voice through the website and has supplied 15 MP3 clips in
`assets/audio/voice/`. The asset manifest records intended tagged input and file
validation; voice name/ID, model, plan, actual billed usage and subjective
listening remain unconfirmed. These are separate from the earlier Sarah API
previews below. No custom voice ID has been guessed or put into config.
The original API-only restrictions described below apply to that earlier
revision; website generation is a separate, user-approved workflow.
See [the supplied pack](../assets/audio/voice/README.md) for credits and exact
Chrome/Firefox listening checks. All 15 files decode; V2/V3 are complete, V4 needs
its final source/pack check, and playback integration remains V5.

## Verified service limits

| Feature | Free-profile decision | Evidence |
|---|---|---|
| Voice Design / creation | Removed, no calls | Live HTTP 403 `feature_unavailable`: “Creating a voice through the API is only available on a paid plan.” |
| Standard TTS | Keep, with eligible account voices and quotas | [Create speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert); three successful free-account calls below |
| Voice Library | No Library/professional voice dependency | [Voice Library](https://elevenlabs.io/docs/eleven-creative/voices/voice-library) says free API users cannot use Library voices |
| Music API | Removed; original music box composed/rendered locally in V2 | [Music API availability](https://elevenlabs.io/docs/overview/capabilities/music) requires paid subscribers |
| Sound Effects API | At most two short build-time calls in V3, only within free quota; local synthesis fallback | [API pricing](https://elevenlabs.io/pricing/api) lists free SFX generations; do not assume separate allowances from the shared quota |
| Format | MP3 44.1 kHz / 128 kbps | [Create speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert); no premium PCM/WAV/192 kbps dependency |
| Voice availability | Account-dependent, never guaranteed by a key alone | [Default voice retirement](https://elevenlabs.io/docs/help-center/product/voices/my-voices/what-are-default-voices): accounts created before March 2026 only; expires after December 31, 2026 |
| Licence | Noncommercial, attribution required | [Publication rules](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform); no commercial-use claim |

Checked 2026-10-30. The live subscription endpoint returned `tier: free`,
`character_count: 0`, `character_limit: 10000`,
`can_extend_character_limit: false` before preview synthesis. These are account
observations, not a guarantee that every newly created free account has the
same voices. The service's current [pricing](https://elevenlabs.io/pricing)
lists 10,000 free monthly credits; credits are shared between products, and
app access is not the same as API access.

## V1: existing adult narrator and three saved previews

Selected default: **Sarah**, `EXAVITQu4vr4xnSDxMaL`, in `src/config.js`.
Sarah's account metadata describes an adult, warm, mature, reassuring voice.
This is a metadata-based default; subjective listening review remains manual.
No new voice was created, no voice slot consumed, and no Voice Library
replacement was added.

The original direction remains a tone reference: soft, gently lilting, almost
too sweet, like an adult nursery-rhyme narrator. Standard TTS settings and
authored copy approximate that direction; no custom voice or child imitation
is promised. Adult candidates were returned as `category: premade` by this
account's list-voices API, then individually verified with successful TTS.

- Model: `eleven_multilingual_v2`.
- Output: `mp3_44100_128`.
- Settings: stability 0.6, similarity boost 0.75, style 0.2, speed 0.85,
  speaker boost enabled.
- All IDs, model, output format, settings, budgets and expiry are in
  `src/config.js`; there is no Voice Design model in the app.

Preview text, authored by the Butu project (145 submitted characters per voice):

```text
Hello, little star. I saved a quiet place beside me. We can take our work one tiny step at a time. I will still be right here when you come back.
```

| Preview title / credit | Local file | Voice ID | Duration | Reported credits |
|---|---|---|---|---|
| Sarah — elevenlabs.io | [preview-1.mp3](voice-previews/preview-1.mp3) | `EXAVITQu4vr4xnSDxMaL` | 10.588 s | 145 |
| Matilda — elevenlabs.io | [preview-2.mp3](voice-previews/preview-2.mp3) | `XrExE9yKIg1WjnnlVkGX` | 11.099 s | 145 |
| Lily — elevenlabs.io | [preview-3.mp3](voice-previews/preview-3.mp3) | `pFZP5JQG7iQjIQuC4Bku` | 12.028 s | 145 |

All three responses were HTTP success with MP3 data. FFprobe confirms mono
MP3 at 44.1 kHz. Total: **435 submitted characters and 435 service-reported
credits** (`character-cost` response headers); no dollar amount is inferred.
The account had 9565 credits remaining after these calls, assuming no other
account activity. No SFX or Music quota was spent in this revision.
[Manifest](voice-previews/manifest.json) preserves requests/settings, selected
ID, byte sizes, timing, account quota snapshot and reported costs. No API key
is stored in it. Preview files are documentation assets, not yet the V4 base
whisper pack and not copied into extension builds.

Generate new previews only when needed (uses free credits):

```sh
scripts/audio/voice-preview generate docs/voice-previews-another-run
```

Use Node 22+. Read `ELEVENLABS_API_KEY` from the environment or gitignored
project-root `.env`. A new output directory is required; existing previews
are refused before any network request. The script checks a free account with
overages disabled, validates remaining quota and verifies premade voice
metadata before synthesis. It sends sequential standard TTS requests only,
never downloads a remote preview URL, and stops on the first error without
retrying or selecting a paid alternative. Each attempted request is reserved
in the manifest before dispatch, including uncertain failures.

`scripts/audio/voice-preview select <directory> <number>` selects a successful
preview locally while the config voice is unset. It needs no key or API call.
Sarah is already configured; changing the default later is an explicit local
config decision. Do not rerun generation just to change the local selection.

## Budget and fallback contract for the remaining app work

The shared pure helper `src/lib/voice-budget.js` is used by the preview script
now and must be used by session dispatch in V6:

- 300 submitted characters/request, 600/session, 6000 in a rolling 31-day
  local reservation window; preview batch capped at 600.
- Three personalised lines (one each for stages 2–4), replacing the old 4–5.
  A long task that makes the complete batch exceed the cap uses bundled audio.
- V6 persists reservations before network dispatch. Do not release uncertain
  failures or auto-retry. V7 distinguishes reserved/submitted counts from
  service-reported credits; source quotas may be spent elsewhere.
- On missing key, unavailable voice, quota exhaustion, access error, timeout,
  expired voice or budget failure: use bundled audio, no paid replacement.
- The helper disables API synthesis after 2026-12-31. Do not silently migrate
  to the suggested replacement voices: those may be paid Library voices.
- Subscription/voice discovery is build-time only. Runtime remains opt-in
  session-start TTS with authored task-only lines; no page content, URLs,
  history or diary data. No new permissions or network hosts.
- No automatic top-up, billing change, SDK dependency or paid feature.
  A finite free allowance cannot provide unlimited personalised sessions.
- Existing runtime code currently has no ElevenLabs synthesis path: V5/V6 are
  still unchecked. The helper alone does not constitute runtime budget wiring.

At 600 characters/session the local 6000-character allowance covers ten
maximum-size sessions per rolling 31 days. This leaves room within a typical
10,000-credit allowance for the base pack and a few build-time effects, but
only the provider knows the true shared remaining quota. V4 must check it.

## Credits and publication

These MP3 previews were generated with ElevenLabs standard TTS on the Free
plan, from original Butu text. They are **not CC0** and do not inherit a
permissive source-code licence. Free-plan output is noncommercial.
When publishing generated audio (including a demo), include `elevenlabs.io`
or `11.ai` in the title per the linked publication rules. Keep that credit in
asset manifests, audio credits, demo titles and the eventual diary settings.
A project-wide code licence does not override these audio terms.

The original local test chime and V2 music box are separately CC0; see
[their credits](../assets/audio/README.md). V3 must record whether each effect was
generated with ElevenLabs or synthesized locally. No real-person voice
recordings, cloning or reference likenesses were used.

## V2: original local music box

User confirmed the local approach. **No ElevenLabs Music API, downloads, key,
requests, characters or credits used (all zero).** The four bundled MP3s are in
[`assets/audio/music-box/`](../assets/audio/music-box/README.md), with source
durations, PCM peaks, encoder version and SHA-256 hashes in its manifest.
Original composition and synthesized recordings: Butu project,
“A Place Beside Me”, dedicated under CC0 1.0. These files have separate rights
from the ElevenLabs speech assets.

The authored score in `src/lib/music-box.js` is eight bars of 3/4, C major,
24 beats total. Melody (durations in quarter-note beats):

| Bar | Melody | Lower tine on beat 1 |
| --- | --- | --- |
| 1 | E6(1), G6(½), E6(½), C6(1) | C5 |
| 2 | D6(1), E6(1), G6(1) | G4 |
| 3 | A6(1½), G6(½), E6(1) | A4 |
| 4 | D6(2), B5(1) | G4 |
| 5 | E6(1), G6(½), C7(½), B6(1) | C5 |
| 6 | A6(1), G6(1), E6(1) | A4 |
| 7 | F6(1), E6(½), D6(½), B5(1) | F4 |
| 8 | D6(1), C6(2) | C5 |

Each tine is additive synthesis: fundamental plus quiet inharmonic partials at
2.76× and 5.4× frequency, weighted 0.85/0.12/0.03 and decaying with time
constants 0.65/0.22/0.10 seconds. A 6 ms attack and final 80 ms release soften
boundaries; each strike rings for at most three seconds. Melody gain is 0.14,
lower-tine gain 0.045. No loudness normalization or random source is used.

| Stage / file | Process |
| --- | --- |
| 1 / `stage-1-in-tune.mp3` | Render the full score at 80 BPM, A4=440 Hz equal temperament; 0.1 s lead-in and 2 s after the 24-beat score (20.1 s total). |
| 2 / `stage-2-slower.mp3` | Re-render identical notes at 64 BPM: note spacing grows 25%, pitch and tine decay stay unchanged (24.6 s total). No resampling/pitch shift. |
| 3 / `stage-3-detuned.mp3` | Keep stage 2 timing; cycle per-strike offsets of 0, −23, +17, −35, +29, −12, +8 cents, plus ±9 cents sinusoidal wobble at 1.7 Hz. Integrate instantaneous frequency to avoid phase jumps (24.6 s total). |
| 4 / `stage-4-winding-down.mp3` | Use the same score but stop strikes before beat 16, leaving the phrase unfinished. At score beat b, onset is `0.1 + (60/64) × (b + 0.055b²)` seconds. Retain stage 3 offsets/wobble, subtract 32b cents per strike and another 45 cents per second as it rings. Strike gain falls by `1 − 0.65b/16`. End four seconds after the last strike: three seconds of decay, then one full second of silence. |

`scripts/audio/music-box` renders deterministic 44.1 kHz PCM with Node's standard
library, checks finite samples/headroom, then invokes the installed FFmpeg
`libmp3lame` encoder for mono 128 kbps MP3. FFmpeg is build-time only. Reproduction:

```sh
scripts/audio/music-box generate /tmp/butu-music-box-review
node --test tests/music-box.test.js
./build.sh
```

Choose a fresh output directory; the generator refuses overwrites. Identical
PCM is reproducible; encoded byte identity depends on the installed FFmpeg/LAME
version. The build copies the bundled files to both browser distributions.
These are finite cues with silent tails, not certified seamless loops. Stage 4
must play once and stay stopped; looping and crossfade policy belongs to V5.

Automated checks verify score length, unchanged stage 2 tuning, slower onsets,
stage 3 offsets, progressive stage 4 spacing/pitch loss, finite unclipped samples,
and silent tails (a full final second for stage 4). MP3 decode/format and build inclusion are checked
separately during V2 verification. Automated checks do not judge musical quality.

V2 verification: all 34 Node tests pass; `./build.sh` and `git diff --check` pass.
FFprobe reports mono 44.1 kHz MP3 for all four clips; FFmpeg decodes each without
errors. Source hashes match the manifest and copies in both browser builds.
Stage 4's final half-second decodes to zero PCM samples. Existing-directory
generation is rejected without overwriting the pack.

Exact manual listening checks (still pending):

Chrome:

1. Run `./build.sh`. Open Chrome and press Ctrl+O for each file, in order:
   `dist/chrome/assets/audio/music-box/stage-1-in-tune.mp3`,
   `stage-2-slower.mp3`, `stage-3-detuned.mp3`, `stage-4-winding-down.mp3`
   (all four in that same directory). Press Play each time.
2. At comfortable low system volume, confirm a gentle recognizable melody;
   stage 2 slower with unchanged pitch, stage 3 mildly wrong without harshness,
   stage 4 slowing/falling/weakening, then stopping. Let stage 4 reach its end;
   confirm no clipped tail, restart or abrupt click.
3. In `chrome://extensions`, reload/load unpacked `dist/chrome/`. Start and stop
   a session from the popup; confirm normal behavior and no extension errors.
   Automatic stage music awaits V5. V2 adds no runtime network requests.

Firefox:

1. Run `./build.sh`. In Firefox use Ctrl+O to open and Play, in order,
   `dist/firefox/assets/audio/music-box/stage-1-in-tune.mp3`,
   `stage-2-slower.mp3`, `stage-3-detuned.mp3`, `stage-4-winding-down.mp3`
   (all four in that same directory).
2. Repeat the same low-volume melody, speed, tuning and full-stop checks;
   listen to each full cue, especially the final ring and silence in stage 4.
3. In `about:debugging` → This Firefox, reload the add-on or Load Temporary
   Add-on → `dist/firefox/manifest.json`. Start/stop a popup session and check
   extension errors. Automatic stage music awaits V5; no runtime requests added.

## Exact manual checks

Chrome:

1. Open each of `docs/voice-previews/preview-1.mp3`, `preview-2.mp3` and
   `preview-3.mp3` with Ctrl+O in Chrome; press Play on each.
2. Confirm the complete preview text plays without glitches. Compare adult,
   gentle delivery and intelligibility; reject childish or harsh delivery.
   Sarah is selected from metadata; record any preference before changing it.
3. Confirm Sarah's ID agrees between `src/config.js` and the preview manifest.
4. Run `./build.sh`. In `chrome://extensions`, reload/load `dist/chrome/`.
   Open the popup and start/stop a focus session; confirm normal behavior.
5. In the extension service-worker Network panel confirm this revision adds no
   runtime ElevenLabs calls. Preview generation runs in Node only. Full
   stage-audio/fallback checks belong to V5/V6, not this revision.

Firefox:

1. Use Ctrl+O in Firefox to open the same three local MP3s; press Play on each.
2. Check complete playback, adult gentle delivery, and intelligibility. Compare
   the same Sarah default; do not create a separate Firefox voice.
3. Confirm the shared config and manifest use the same Sarah ID.
4. After `./build.sh`, open `about:debugging` → This Firefox → Load Temporary
   Add-on → `dist/firefox/manifest.json` (or Reload an existing install).
   Open the popup, start/stop a session, and check for errors.
5. Check the extension Network panel: no new runtime ElevenLabs calls.
   V5/V6 remain responsible for actual stage audio and session TTS integration.

Automated checks cover budget boundaries/expiry and a mocked complete preview
workflow: paid accounts, overages, quota shortage, Library-only voices, HTTP
errors with retained reservations, overwrite protection and local selection.
These checks do not judge subjective voice quality.

## V3: sound effects

`scripts/audio/sfx generate <new-output-directory>` bundles the crayon sound
and return chime using Node's built-in fetch and local FFmpeg. No new dependency,
permission or runtime network host. `--local` skips all network requests and
renders original CC0 fallbacks. Existing directories are refused before any
API call. A missing key, invalid/paid account, enabled overages, low quota or
any API error stops generation immediately and retains local fallback files.
No retries or paid-feature substitutions. A successful first clip is retained
if the second request fails. Partial/uncertain requests keep their reservation.
This build ledger is separate from V6's runtime TTS character budget.

The [Create sound effect API](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert)
uses `POST /v1/sound-generation?output_format=mp3_44100_128` with explicit
`model_id: eleven_text_to_sound_v2`, `loop: false`, and `prompt_influence: 0.5`.
The [capability guide](https://elevenlabs.io/docs/overview/capabilities/sound-effects)
lists 40 credits/second for specified durations; reserve that conservative
estimate before dispatch. The provider-reported cost is recorded separately,
never inferred from prompt character counts. No voice ID, task text, page data
or browsing history is used by this build-time tool.

Prompts (verbatim):

- **crayon-scribbling**, 3 seconds: “Close-up of a wax crayon scribbling little doodles on textured paper. Soft dry grainy strokes, short irregular back-and-forth movements, tiny pauses. Gentle and intimate, quiet room, no voices, no music, no sharp impacts.”
- **happy-return-chime**, 2 seconds: “A tiny warm toy bell welcome chime, softly rising with a happy relieved feeling, like a teddy bear greeting a returning friend. Delicate rounded music-box tones with a short gentle decay into silence. No voices, no dramatic swell, no harsh attack.”

Live generation, 2026-10-30:

- Both pre-request subscription checks returned `tier: free`,
  `can_extend_character_limit: false`, `character_count: 1614`,
  `character_limit: 10000`: 8,386 credits available at those observations.
  The shared counter had not updated before the second request; the script
  also subtracts its own reservations from the initial observed allowance.
- Exactly two SFX requests: 120 + 80 = **200 credits reserved**;
  `character-cost` response headers reported **30 + 20 = 50 credits**.
  **468 prompt characters** submitted; these are not the billing unit.
  No retries, top-ups, Music API calls or paid replacements.
- Post-generation remaining account quota was not queried; do not present
  8,386 as the current balance. Future invocations recheck the live account.
- Both API files and both local fallbacks fully decode at 44.1 kHz, with
  measured durations of 3s/2s (API stereo, fallbacks mono). Subjective listening is pending.
  Source, hashes, encoder, quota snapshots and costs are in
  `assets/audio/sfx/manifest.json`.
- API asset credit: **Sound effects generated with ElevenLabs —
  [elevenlabs.io](https://elevenlabs.io)**. Free-plan outputs are
  **noncommercial, attribution required**, not CC0; see the
  [publication rules](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform).
  The separately retained `*-fallback.mp3` files are original Butu project
  synthesis, **CC0-1.0**, from `src/lib/sfx.js`, without samples or recordings.

Verification: `node --test tests/sfx.test.js` covers deterministic quiet
fallbacks, free-account/overage/quota checks, changing quota, persisted
reservations before dispatch, API restriction, timeout, invalid content type,
no retries, secret redaction, offline mode and overwrite protection. Full
unit tests and `./build.sh` also apply. These checks do not judge the sound.

Manual Chrome checks:

1. Press Ctrl+O and open `/home/rupam/butu/assets/audio/sfx/crayon-scribbling.mp3`;
   press Play. Expect soft, dry crayon strokes with small pauses, no speech or
   harsh impact. Open `happy-return-chime.mp3` from the same directory and play:
   expect a gentle welcoming rise and decay, without an abrupt loud attack.
2. Repeat with `crayon-scribbling-fallback.mp3` and
   `happy-return-chime-fallback.mp3`; check complete playback and gentle endings.
3. Run `./build.sh`, reload `dist/chrome/` at `chrome://extensions`, open the
   popup, start then stop a session, and check the service-worker console for
   errors. All four files must exist under `dist/chrome/assets/audio/sfx/`.
4. Inspect the extension Network panel: no runtime `/v1/sound-generation`
   requests. Automatic stage scribbles/chime playback will be wired in V5.

Manual Firefox checks:

1. Press Ctrl+O and open the same `crayon-scribbling.mp3`, then
   `happy-return-chime.mp3`; press Play for each and check the same soft strokes
   and gentle welcoming chime with no voices, harsh attack or truncated ending.
2. Open and play both `*-fallback.mp3` files; check complete playback and fades.
3. After `./build.sh`, use `about:debugging` → This Firefox → Load Temporary
   Add-on → `dist/firefox/manifest.json` (or Reload). Open the popup, start then
   stop a session and check the extension console for errors. Confirm all four
   MP3s under `dist/firefox/assets/audio/sfx/`.
4. Inspect the extension Network panel: no runtime `/v1/sound-generation`
   requests. Actual stage-audio integration remains V5 in both browsers.

## Retired Voice Design experiment

Before the user scrapped Voice Design, requests returned HTTP 403 with
`feature_unavailable` / `feature_not_available`. The first attempt failed at
the sandbox network boundary; later API rejections named the paid-plan
restriction. No Voice Design previews or voice were created. Local diagnostic
evidence stays in `.local-reports/voice-design-attempts/` (gitignored).
The abandoned design script, design tests and design-model config have been
removed; this document keeps the reason rather than a paid setup instruction.

## V4: supplied companion base pack

The existing 15 original MP3 exports in `assets/audio/voice/` are the intended
Butu voice (decision 17), distinct from the Sarah API candidate. V4 makes no
new generation requests, submits zero characters and changes none of the audio.
Original website-generation credits/characters, voice ID, model and plan remain
unknown and are explicitly null in the manifest; no account quota is inferred.
Conservative ElevenLabs noncommercial/attribution terms remain in force.

All 15 generic scripts are now authored in `BASE_VOICE_LINES` in
`src/templates.js`, keyed by `butu-01` through `butu-15`. The
[manifest](../assets/audio/voice/manifest.json) maps each clip to its template
and records intended plain text plus tagged input. Intended text is not a
verified transcript. Run `scripts/audio/base-pack check` for offline template,
count, hash, format and full-decode verification. It never edits the recordings.
Voice/model/plan and listening confirmation are still required to close V4.

Verification: all 36 unit tests pass (the build test required running outside
the sandbox after a child-shell EPERM). Both builds pass the pack checker;
changed script text and a corrupted MP3 are correctly rejected in temporary
fixtures. `git diff --check` passes. Browser listening is still pending.

Exact manual checks, for **each browser separately**:

1. Run `./build.sh`. In Chrome use Ctrl+O to open
   `/home/rupam/butu/dist/chrome/assets/audio/voice/butu-01.mp3` through
   `butu-15.mp3`; in Firefox open the corresponding files under
   `/home/rupam/butu/dist/firefox/assets/audio/voice/`.
2. Press Play on every clip. Compare every word against `intended_text` in
   the manifest. Confirm tags are acted rather than spoken, a consistent sweet
   companion voice, complete endings and no glitches or harsh peaks.
3. Run `scripts/audio/base-pack check dist/chrome/assets/audio/voice` and
   `scripts/audio/base-pack check dist/firefox/assets/audio/voice` to verify
   each built pack and manifest match the source templates and original hashes.
4. Chrome: reload `dist/chrome/` in `chrome://extensions`; Firefox:
   `about:debugging` → This Firefox → Load Temporary Add-on →
   `dist/firefox/manifest.json` (or Reload). In each browser open the popup,
   start then stop a session and check the extension console for errors.
   Automatic stage speech belongs to V5; this asset task adds no runtime calls.
