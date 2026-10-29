# Phase 0 report — 2026-10-29

Phase 0 is complete at the experiment level. No unresolved Phase 0 blocker
prevents starting task 1.1. Phase 1 and later tasks remain unchecked.
This report summarizes archived measurements; no new browser benchmark was run
for this documentation checkpoint.

Tested on Linux with Chrome for Testing 153.0.8010.12 and Firefox 154.0.1,
in isolated profiles, sequentially. Times are individual observations, not
performance guarantees. MiB means 1,048,576 bytes.

| Measurement | Chrome | Firefox |
| --- | ---: | ---: |
| Historical fixed-prompt generation, SmolLM2 MHA q8, 25-token cap | 3,226 ms | 3,247 ms |
| Current MiniLM-L3 q8 model load, final fixture | 1,096 ms | 1,505 ms |
| Current embedding inference, task + three titles, sequential | 95 ms | 61 ms |
| Largest observed individual renderer RSS high-water mark, final fixture | 431.7 MiB | 349.1 MiB |
| Renderer RSS after release and 30-second quiet window | 167.9 MiB | 137.0 MiB |
| Separate model-cache audit: cold load / reload | 14,572 / 854 ms | 7,706 / 1,309 ms |

Generation is historical only: the normal extension uses authored templates and
loads no generative model. That historical generation run loaded the text model
in 35,475 ms / 36,120 ms (Chrome / Firefox). Generated copy failed product-quality
checks; its retirement is settled in decisions 5–6. See
[historical model evidence](../experiments/phase0/MODELS.md).

Current timing and memory figures come from the
[embedding-only evidence](../experiments/phase0/LOW-MEMORY.md). Chrome's separate
cold run recorded 8,027 ms loading, 325 ms inference and a **446.5 MiB** individual
renderer peak. Its sampled sum of candidate extension renderers reached
**614.5 MiB** (final run: 430.8 MiB). That sum can include other startup overhead
and double-count shared resident pages; it is not wholly attributed to Butu.
The individual-renderer checks passed the configured 500,000,000-byte target.
Neither those peaks nor the post-release snapshots prove a whole-browser or
full-session 500 MB ceiling. Firefox's process-monitor snapshots use a different
metric and must not be reported as peak RSS.

Both browsers passed all three short relevance fixtures, input bounds,
cancellation, score caching and worker release. The
[model-file cache audit](../experiments/phase0/CACHE.md) found four cache hits
and zero remote model fetches after actual extension reload in each browser.
[Bundled MP3 playback](../experiments/phase0/AUDIO.md) reached native completion
and the audio output pipeline with an ordinary website focused and no user
activation on the website or host.

Firefox initially suspended its event page under default idle settings. The
user-approved session heartbeat then passed **665 seconds (11 min 5 s)** with
no extension inspector or visible extension views during quiet intervals.
Worker idle release/reload, audio, stop/expiry cleanup and subsequent suspension
passed. See [lifetime evidence](../experiments/phase0/LIFETIME.md).
ElevenLabs calls and characters used in Phase 0: **0**.

Remaining blockers and risks for the plan:

- **Session ownership (1.5, 4.6, V5–V6):** integrate the approved Firefox heartbeat
  only while a session is active. Persist state/end timestamps, use alarms and
  recover after restart, sleep or a host crash. The probe does not implement that
  recovery or prove a full 45-minute session. Lost personalised audio must fall
  back to bundled clips without another TTS batch. Chrome host recreation also
  needs full-session integration checks. New permissions/hosts still need user
  approval under AGENTS.md; Phase 0 added none for the heartbeat.
- **Memory (4.6, 4.10):** popup, diary, decoded audio, stage effects and concurrent
  activity were absent from the memory fixture. Measure the integrated extension
  on the 4 GB machine; keep individual-renderer and process-group totals distinct.
- **Detection (2.1–2.4):** short-title ranking does not prove real-page accuracy.
  Tune MiniLM-L3 on the actual bounded sequential path and 20 real pages,
  including related/unrelated YouTube videos. Old L6/batched scores are unsuitable
  threshold evidence. Handle queue saturation, cancellation and slow first-use
  downloads; the current request timeout includes download and is 120 seconds.
- **Caching and disk capacity (4.7, 4.9):** reload caching passed, but eviction,
  cleared data or changed extension identity can require another download.
  Earlier experiments encountered cache/quota errors in temporary profiles.
  Provide download progress and failure handling; repeat the full privacy audit
  once all product paths exist.
- **DOM restoration (3.2–3.7, 4.10):** reversible edits, dynamic pages, focused-form
  protection, visibility/focus timing and reduced motion remain unproven.
- **Core ElevenLabs work (V1–V7):** voice creation, Music, Sound Effects, base pack,
  crossfades, personalised TTS, fallback and character accounting are all pending.
  API access, available credits, current terms and asset rights must be checked
  during those tasks. The synthetic Phase 0 chime proves playback plumbing only.
  Stage audio and an actual speaker-listening pass remain necessary; automated
  output capture used a null sink after hardware-output stalls.
- **Delivery:** most product work and the demo/write-up remain. Keep the ordered
  core plan and ElevenLabs work ahead of optional integrations and stretch work.

Manual verification steps for both browsers (Phase 0 fixture):

1. From the repository root, run `sh experiments/phase0/prepare.sh`.
2. **Chrome:** open `chrome://extensions`, enable Developer mode, Load unpacked
   `/home/rupam/butu/experiments/phase0/chrome/`. Inspect `offscreen.html` through
   Inspect views or `chrome://inspect/#extensions`. Confirm the MiniLM-L3 q8
   header, ranking/template logs, `Score cache PASS`, `Idle teardown PASS`, and
   `Result:` with `passed: true` and `released: true`. Record active/idle memory
   with Shift+Esc; use the linked harness for peak measurements.
3. **Firefox:** open `about:debugging` → This Firefox → Load Temporary Add-on →
   `/home/rupam/butu/experiments/phase0/manifest.json`. Immediately click Inspect
   and confirm the same logs. Record active/idle Extensions memory in
   `about:processes`; these snapshots are not peaks.
4. **Each browser:** in its host console obtain
   `chrome.runtime.getURL('src/model-host/audio-test.html')` and open that URL.
   In the audio-test tab console run
   `setTimeout(() => chrome.runtime.sendMessage({ type: 'phase0:play-audio' }).then(console.log), 5000)`.
   Switch to an ordinary website within five seconds without clicking the page.
   Hear the chime; return and confirm `playing: true`. In Chrome repeat after
   35 seconds of silence to check host reuse/recreation.
5. For reload/network verification follow the exact console commands for each
   browser in [CACHE.md](../experiments/phase0/CACHE.md). For the inspector-free
   Firefox 12-minute heartbeat/stop/expiry check and Chrome audio regression,
   follow [LIFETIME.md](../experiments/phase0/LIFETIME.md#exact-manual-verification).
   Remove both temporary extensions after testing.
