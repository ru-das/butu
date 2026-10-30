# Plan

Work top to bottom. One task per request. Each task lists how to verify it.
2026-10-30: user explicitly authorized the free-tier audio revision across tasks;
V1 is replaced and later audio requirements below are updated, not marked implemented.
Primary prize target is ElevenLabs: Phase 3.5 is core work, not polish.

## Phase 0: Prove the risky parts (do first)
- [x] Phase 0 complete; measurements, remaining risks and both-browser checks:
      Local report: `.local-reports/PHASE0-REPORT.md` (untracked, 2026-10-29).
- [x] 0.1 Vendor Transformers.js + ONNX Runtime WASM files into vendor/.
      Verify: files load from the extension, not a CDN.
- [x] 0.2 Minimal Firefox extension: background page loads SmolLM2-135M-Instruct,
      generates one line from a fixed prompt, logs generation time.
      Verify: output in console; memory checked in about:processes.
- [x] 0.3 Same extension: embed the DBMS task and compare three titles with all-MiniLM-L6-v2, log all cosine similarities.
      Verify: related strings score clearly higher than unrelated ones.
- [x] 0.4 Chrome equivalent using an offscreen document.
      Verify: same outputs in Chrome; memory checked in Chrome Task Manager (Shift+Esc).
- [x] 0.4a User-approved low-memory revision: required MiniLM-L3 in a lazy,
      bounded worker; authored task/heading templates; no normal generative path.
      Verify: both browsers pass ranking, bounds, cache, cancellation and release;
      record renderer peaks and distinguish them from whole-browser totals.
      Historical 0.2/0.3 generator/L6 results remain archived.
- [x] 0.5 Check model files cache: reload the extension, confirm no re-download.
      Verified both browsers: four Cache API hits, zero remote model fetches;
      evidence and manual Network checks in experiments/phase0/CACHE.md.
- [x] 0.6 Play a bundled MP3 from the Firefox background page and the Chrome
      offscreen document while a normal web page is focused.
      Verify: audio plays in both browsers without user interaction on the page.
- [x] 0.7 Firefox background page lifetime: confirm session routing and audio work
      for 10+ minutes; embeddings may unload while idle and reload on demand.
      If the page gets suspended, propose
      a keep-alive approach and stop for approval.
      User-approved heartbeat verified for 665 seconds with default idle settings,
      no visible extension views/debugger, worker idle release/reload, audio and cleanup.
      Evidence and both-browser manual steps: experiments/phase0/LIFETIME.md.

STOP after Phase 0 and report results (times, memory, any blockers).

## Phase 1: Skeleton
- [x] 1.1 manifests/chrome.json, manifests/firefox.json, build.sh, .gitignore (.env, dist/).
      Verify: empty extension loads in both browsers without errors.
      Verified isolated Chrome/Firefox loads; permissions and manual steps: docs/SKELETON.md.
- [x] 1.2 src/config.js with all model IDs, thresholds, stage timings, voice ID placeholder.
      Spec values documented; threshold, default volume and stage crossfade are
      explicitly unset pending task 2.4 / V5, as approved by the user.
- [x] 1.3 src/shared/: paper texture, pastel palette, bundled handwriting fonts
      (with licence files in assets/fonts/).
      Verify: fonts render offline in popup and a blank diary.html.
- [x] 1.4 Popup: Butu greeting, task input, duration picker, "Let's do it together!",
      countdown from stored end time.
      Verify: closing/reopening popup keeps countdown correct.
      Verified extension popup pages in isolated Chrome/Firefox; storage contract,
      scope and both-browser toolbar checks: src/popup/README.md.
- [x] 1.5 Session lifecycle in background.js: start, end on timer (chrome.alarms),
      manual stop, state in storage.local.
      Verify: session survives closing the popup and ends on time.
      Background lifecycle regression test, storage/message contract and exact
      Chrome/Firefox manual checks: src/popup/README.md.

## Phase 2: Detection
- [x] 2.1 content.js extracts title + meta description + first ~500 chars of main text.
      Skips navigation, footers, hidden and editable content; both browsers pass
      22 DOM/message checks. Contract and exact installed-extension manual steps:
      src/content/README.md.
- [x] 2.2 src/lib/similarity.js (cosine) + unit test.
- [x] 2.3 On-task verdict: allowlist/blocklist first, then embeddings; cache per URL.
      Skip extension pages, browser internal pages and the new tab page.
      Console scores, bounded session cache, race/error checks and both-browser
      manual steps: docs/VERDICTS.md. Embedding verdicts remain explicitly untuned
      until task 2.4 sets ON_TASK_THRESHOLD.
- [x] 2.4 Threshold tuning: run against 20 real pages for one sample task,
      record scores in docs/threshold-notes.md, set ON_TASK_THRESHOLD.
      Verify: a relevant YouTube video counts as on task; an unrelated one doesn't.
      Set recall-first 0.13: 10/10 relevant, 6/10 unrelated correct; four false
      positives documented. All 20 frozen inputs match exactly in Firefox;
      live Chrome YouTube pair passes. Full inputs, logs and both-browser manual
      checks: docs/threshold-notes.md.

## Phase 3: Corruption
- [x] 3.1 src/lib/stages.js (off-task seconds → stage) + unit test.
- [x] 3.2 Off-task timer in content.js: counts only when tab visible and window focused.
      Per-tab totals survive navigation/background wakes; 60 foreground on-task
      seconds reset all tabs. Regression coverage, browser content-script checks,
      storage contract and exact Chrome/Firefox manual steps: docs/OFF-TASK-TIMING.md.
      Installed headed-browser focus, navigation, reset and real expiry checks:
      docs/TIMING-CHECKS.md (both browsers verified, 2026-10-30).
- [x] 3.3 assets/doodles/: hand-drawn style SVGs, wobbly strokes, pastel crayon look.
      Calm set: stars, smiley, small teddy-bear Butu, heart, flower.
      Butu variants: Calm, Waiting, Lonely, Something’s wrong, Abandoned; follow
      the appearance table in SPEC.md, including the returning uneven smile.
      Corrupted set: same shapes going wrong (smile gone, eyes overdrawn, scribbled over),
      plus 3 scribble overlays of increasing intensity.
      Verify: view all variants on one test page; calm set reads as innocent,
      and every stage is recognisably the same teddy bear.
      16 original CC0 SVGs and an offline test sheet: src/doodle-test/index.html.
      Inventory, credits and exact Chrome/Firefox checks: assets/doodles/README.md.
- [x] 3.4 haunt.css + stages 1–4 using doodles and placeholder text; full restore on return.
      Verify: return to on-task tab → page identical to original.
      Installed Chrome/Firefox: all four stages on W3C, CERN and IANA; exact
      HTML and node identity restored on return. Both browsers pass 32 additional
      DOM checks. Evidence: docs/haunt-checks.json; exact manual steps and
      restoration/asset contract: src/content/README.md.
- [x] 3.5 prefers-reduced-motion variants.
      All stages stay static; the opacity-only return fade remains. Scoped CSS
      responds to live preference changes without affecting host-page effects.
      Both-browser checks and manual steps: src/content/README.md.
- [x] 3.6 src/templates.js in Butu's tone: 20+ taunts, 10+ stage-4 lines,
      10+ voice-line templates using {task}, 10+ diary captions, popup summary lines.
      24 taunts, 12 stage-4 lines, 12 task-only voice templates, 12 diary captions
      and 5 popup summary lines. Approved tone samples retained; pack counts,
      placeholders and interpolation verified by tests/templates.test.js.
      Installed Chrome/Firefox popup-origin imports and all 65 lines pass;
      checks and browser versions: docs/template-checks.json.
- [x] 3.7 Wire template-backed possession text into stages 2/4 and diary captions:
      cache per-page template choice, interpolate bounded task/heading values as
      plain text, restore original content on return. No generation/retry loop.
      Stable page/session selection, stage-2/4 copy, current-session diary caption
      and local template-source logs wired. Both browsers: 10 public pages,
      28 template lines / 0 model lines each; exact markup and nodes restored.
      31 unit tests and 58 DOM checks pass. Evidence and exact manual checks:
      docs/POSSESSION.md and docs/possession-checks.json.

## Phase 3.5: Butu's Voice (primary prize target)
- [x] V1 (revised) scripts/audio/voice-preview: generate three standard-TTS previews
      from existing adult premade voices on a verified free account; select one
      locally, without creating a voice. Sarah configured after live TTS success;
      Sarah/Matilda/Lily MP3s saved, 435 characters/credits total. Free-profile
      model/format/budgets/expiry in config, shared budget guard and tests, sources,
      licence limits and exact both-browser listening checks: docs/voice-design.md.
      Subjective listening review remains manual; no custom-voice claim.
- [x] V2 scripts/audio/music-box: compose an original short music box lullaby and
      render locally, then produce 4 stage variants (in tune → slower → detuned →
      winding down and stopping). No Music API or downloaded composition. Bundle
      the files with project asset credits; document the process in docs/voice-design.md.
- [x] V3 scripts/audio/sfx: generate sound effects with the Sound Effects API
      (crayon scribbling, happy return chime), at most two short build-time requests
      after checking free quota. Stop on any restriction; use locally synthesized
      effects as fallback. No runtime SFX calls. Record quota, prompts, source and
      ElevenLabs attribution/noncommercial terms in docs/voice-design.md.
      Two successful free-account calls: 3s crayon + 2s return chime; 200 credits
      conservatively reserved, 50 provider-reported credits. Both API MP3s and
      original CC0 local fallbacks bundled in assets/audio/sfx/. Quota/error/
      no-retry checks: tests/sfx.test.js; exact both-browser listening steps:
      docs/voice-design.md. Subjective listening remains manual; V5 wires playback.
- [x] V4 scripts/audio/base-pack: voice 15–20 generic Butu lines; save to
      assets/audio/ with a manifest listing line text per clip. User-approved
      manual website workflow supplied 15 companion clips in assets/audio/voice/;
      all decode, intended tagged scripts and credits are recorded. V4 now maps
      all 15 to BASE_VOICE_LINES in templates.js; scripts/audio/base-pack check
      verifies text, hashes, format and decoding offline with zero API usage.
      User confirmed all 15 sound correct, use their custom voice and were
      generated on the Free plan. Exact voice ID/model and original usage remain
      explicitly unknown; attribution/noncommercial terms are recorded.
      Existing premade API tooling remains a separate fallback. For any further
      API generation check remaining free quota before each request, no retries.
      Include source/attribution and noncommercial terms.
- [x] V5 src/voice.js: stage-driven playback queue in the model host
      (crossfade music box variants, each whisper once per page visit,
      chime + fade out on return).
      Verify: walk an off-task page through all stages and back, in both browsers.
      Chrome 153 / Firefox 154: 23 playback checks each, actual speaker recordings,
      live crossfade gains and 35 seconds of post-stop silence; 39 unit tests pass.
      Evidence and exact both-browser manual checks: docs/VOICE-PLAYBACK.md and
      docs/voice-playback-checks.json. No ElevenLabs requests or characters used.
- [ ] V6 Session-start personalised TTS: fill voice-line templates with task text
      locally (three lines), send ONLY those lines to standard ElevenLabs TTS,
      cache audio for the session,
      clear on session end. Fallback to base pack on any error or missing key.
      Enforce src/lib/voice-budget.js: 300 chars/request, 600/session, 6000 reserved
      chars in a rolling 31-day window; persist reservations before dispatch,
      keep uncertain/failed calls reserved, never auto-retry. Expired/unsupported
      voice, oversized task batch or exhausted allowance → bundled pack, no calls.
      No subscription/list-voices requests at runtime, no paid substitutions.
      Verify: devtools network tab shows only those TTS calls, containing only task text.
- [ ] V7 Log submitted/reserved characters and reported usage separately per session;
      expose remaining local budget and bundled fallback in diary settings. Do not
      claim a local count is the provider's remaining shared account quota.

## Phase 4: Diary and finish
- [ ] 4.1 Session stats saved to storage.local (last 50 sessions).
- [ ] 4.2 Popup session summary + "Open our diary" link (opens diary.html in a tab).
- [ ] 4.3 Diary: session pages with date, task, time, times wandered, caption,
      Butu drawing chosen by session quality (happy → uneasy → wrong).
- [ ] 4.4 Diary: "Places you left me for" (domains in handwriting).
- [ ] 4.5 Diary settings: allowlist/blocklist, ElevenLabs key, volume, mute,
      "test Butu's voice" (bundled clip, no API test call), reserved/submitted
      characters, local allowance/fallback status and ElevenLabs audio attribution.
- [ ] 4.6 Wire embedding-host release + audio cache clear into session end
      (verify memory drops; the standalone worker release API exists from 0.4a).
- [ ] 4.7 First-run download progress UI ("Butu is waking up…").
- [ ] 4.8 README: what Butu is, install for both browsers, ElevenLabs key setup,
      privacy boundary, limitations, credits and licences (fonts, models, assets).
- [ ] 4.9 Network audit in both browsers: only Hugging Face model downloads and,
      if keyed, ElevenLabs TTS at session start. No fonts or images from the network.
- [ ] 4.10 Full run-through against the Definition of done in docs/SPEC.md.

## Demo and write-up support
- [ ] D1 Record the demo: a real work session with sound on, showing the calm
      start, the drift, every stage, the return, and the diary.
- [ ] D2 Narrate the demo intro/outro using the configured existing adult voice
      and standard TTS within remaining free quota; no Voice Design/Music calls.
      Include elevenlabs.io in the published audio/video title and credit free-plan
      output as noncommercial. Use bundled narration if no eligible voice remains.
- [ ] D3 Collect for the write-up: premade voice previews and settings, local music
      composition and SFX prompts, free-plan attribution, characters used and cost,
      voice retirement/account limitations, memory and timing numbers from Phase 0,
      before/after screenshots of a page at each stage.

## Stretch (only if everything above is done)
- [ ] S1 Diary sticker collection: one sticker per completed focused session.
- [ ] S5 site/: landing page for the .tech domain with the demo video.

S2–S4 (generative training data, SmolLM2 fine-tuning and model swapping) were
retired by the user-approved embedding-only design. Their earlier experiment
evidence is retained; they are not marked as completed work.
