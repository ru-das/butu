# Butu audio — elevenlabs.io (free-profile revision)

User-approved revision, 2026-10-30: remove Voice Design and other paid-only
dependencies across the audio plan. V1 now selects an existing adult voice using
standard TTS. V2–V7 remain implementation tasks; this revision does not claim
that music, base-pack generation, stage playback or session TTS already exists.

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

The original local test chime is separately CC0; see
[its credits](../assets/audio/README.md). V2 will credit the original local
composition and synthesis separately. V3 must record whether each effect was
generated with ElevenLabs or synthesized locally. No real-person voice
recordings, cloning or reference likenesses were used.

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

## Retired Voice Design experiment

Before the user scrapped Voice Design, requests returned HTTP 403 with
`feature_unavailable` / `feature_not_available`. The first attempt failed at
the sandbox network boundary; later API rejections named the paid-plan
restriction. No Voice Design previews or voice were created. Local diagnostic
evidence stays in `.local-reports/voice-design-attempts/` (gitignored).
The abandoned design script, design tests and design-model config have been
removed; this document keeps the reason rather than a paid setup instruction.
