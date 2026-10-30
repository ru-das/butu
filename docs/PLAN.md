# Plan

Work top to bottom. One task per request. Each task lists how to verify it.
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
- [ ] 3.1 src/lib/stages.js (off-task seconds → stage) + unit test.
- [ ] 3.2 Off-task timer in content.js: counts only when tab visible and window focused.
- [ ] 3.3 assets/doodles/: hand-drawn style SVGs, wobbly strokes, pastel crayon look.
      Calm set: stars, smiley, small teddy-bear Butu, heart, flower.
      Butu variants: Calm, Waiting, Lonely, Something’s wrong, Abandoned; follow
      the appearance table in SPEC.md, including the returning uneven smile.
      Corrupted set: same shapes going wrong (smile gone, eyes overdrawn, scribbled over),
      plus 3 scribble overlays of increasing intensity.
      Verify: view all variants on one test page; calm set reads as innocent,
      and every stage is recognisably the same teddy bear.
- [ ] 3.4 haunt.css + stages 1–4 using doodles and placeholder text; full restore on return.
      Verify: return to on-task tab → page identical to original.
- [ ] 3.5 prefers-reduced-motion variants.
- [ ] 3.6 src/templates.js in Butu's tone: 20+ taunts, 10+ stage-4 lines,
      10+ voice-line templates using {task}, 10+ diary captions, popup summary lines.
      A small starter pack and tested interpolation exist from 0.4a; expand it.
- [ ] 3.7 Wire template-backed possession text into stages 2/4 and diary captions:
      cache per-page template choice, interpolate bounded task/heading values as
      plain text, restore original content on return. No generation/retry loop.

## Phase 3.5: Butu's Voice (primary prize target)
- [ ] V1 scripts/audio/design-voice: create Butu's voice via ElevenLabs Voice Design
      (soft, sing-song, too sweet, nursery-rhyme narrator; check terms before
      anything childlike). Generate 3+ previews, pick one. Save prompt, previews and
      chosen voice ID to docs/voice-design.md; put the voice ID in src/config.js.
- [ ] V2 scripts/audio/music-box: generate a short music box lullaby with ElevenLabs
      Music, then 4 stage variants (in tune → slower → detuned → winding down and
      stopping). Variants may be produced by re-generation or by local audio
      processing; document which in docs/voice-design.md.
- [ ] V3 scripts/audio/sfx: generate sound effects with the Sound Effects API
      (crayon scribbling, happy return chime). Record prompts in docs/voice-design.md.
- [ ] V4 scripts/audio/base-pack: voice 15–20 generic Butu lines; save to
      assets/audio/ with a manifest listing line text per clip.
- [ ] V5 src/voice.js: stage-driven playback queue in the model host
      (crossfade music box variants, each whisper once per page visit,
      chime + fade out on return).
      Verify: walk an off-task page through all stages and back, in both browsers.
- [ ] V6 Session-start personalised TTS: fill voice-line templates with task text
      locally, send ONLY those lines to ElevenLabs, cache audio for the session,
      clear on session end. Fallback to base pack on any error or missing key.
      Verify: devtools network tab shows only those TTS calls, containing only task text.
- [ ] V7 Log ElevenLabs characters used per session; expose in the diary settings page.

## Phase 4: Diary and finish
- [ ] 4.1 Session stats saved to storage.local (last 50 sessions).
- [ ] 4.2 Popup session summary + "Open our diary" link (opens diary.html in a tab).
- [ ] 4.3 Diary: session pages with date, task, time, times wandered, caption,
      Butu drawing chosen by session quality (happy → uneasy → wrong).
- [ ] 4.4 Diary: "Places you left me for" (domains in handwriting).
- [ ] 4.5 Diary settings: allowlist/blocklist, ElevenLabs key, volume, mute,
      "test Butu's voice", characters used.
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
- [ ] D2 Narrate the demo intro/outro in Butu's voice (ElevenLabs).
- [ ] D3 Collect for the write-up: voice design prompt and previews, music and
      sound prompts, characters used and cost, memory and timing numbers from Phase 0,
      before/after screenshots of a page at each stage.

## Stretch (only if everything above is done)
- [ ] S1 Diary sticker collection: one sticker per completed focused session.
- [ ] S5 site/: landing page for the .tech domain with the demo video.

S2–S4 (generative training data, SmolLM2 fine-tuning and model swapping) were
retired by the user-approved embedding-only design. Their earlier experiment
evidence is retained; they are not marked as completed work.
