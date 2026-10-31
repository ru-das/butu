# Session resource cleanup

Session stop, alarm expiry, cold expiry recovery and failed-start rollback call
`releaseSessionHost` after the archive/clear write succeeds. A failed archive keeps
the running session intact. Firefox terminates the embedding worker, rejects all
pending jobs, clears score cache and immediately releases bundled voice players,
queues, preview, expiry/heartbeat timers and AudioContext. Chrome closes the
existing offscreen document (without creating one), releasing its worker and audio.
An extraction/host creation from the old session cannot dispatch inference later.
The existing five-second idle worker release remains in place during a session.
No persistent model-file cache is deleted; the next session can load it offline.

## Measured memory

2026-10-31, Linux, isolated profiles, real configured MiniLM-L3 q8 model.
`node tests/browser-lifecycle.cjs chrome` / `firefox` use temporary diagnostic
extension copies; shipped source has no diagnostic endpoint. The original 4.6 probe compared
fixed synthetic text through the real client and stopped through `session:stop`
immediately after inference, before the idle timer. The current harness opens a
local synthetic database article, exercises the actual background detection path,
and stops as soon as model readiness arrives (also cancelling pending inference). RSS is read from `/proc`:
Chrome sums extension renderers, Firefox measures the Extensions process. This
is resident memory, not JS heap or whole-browser usage; the browser may retain
allocator pages. After-stop samples are taken three seconds after acknowledgement.

| Browser | Before model (KiB) | Model loaded (KiB) | After stop (KiB) | Drop (MiB) |
| --- | ---: | ---: | ---: | ---: |
| Chrome 153.0.8010.12 | 330208 | 572024 | 396692 | 171.2 |
| Firefox 154.0.1 | 158860 | 339800 | 159348 | 176.2 |

Raw captures: `.local-reports/lifecycle/run-1793422313517/Chrome-153.0.8010.12.json`
and `.local-reports/lifecycle/run-1793422357049/Firefox-154.0.1.json` (untracked).
Unit regressions cover pending/queued release, new-session cache misses,
creation/stop races, session stop/expiry/recovery, audio players/context and preview.

## Exact manual checks

Chrome:
1. Run `./build.sh`; load `dist/chrome` in `chrome://extensions` with Developer mode.
2. Open a normal article, start a one-minute session, and inspect the offscreen
   document. Confirm a model worker appears; record extension memory in Shift+Esc
   immediately after the verdict, before five idle seconds elapse.
3. Stop from the popup. Confirm the offscreen document disappears, audio stops,
   the page restores and the diary summary remains. After three seconds record
   memory again; the model allocation should drop (not necessarily to baseline).
4. Start again: a new worker loads cached files. Let the minute expire while
   the popup is closed. Confirm the same cleanup and one saved diary entry.
5. Stop during a first download and immediately start another session; confirm
   no late verdict/audio from the stopped session affects the new one.

Firefox:
1. Run `./build.sh`; use `about:debugging` → This Firefox → Load Temporary Add-on
   → `dist/firefox/manifest.json`.
2. Start a one-minute session on a normal article; Inspect the extension and
   confirm the embedding worker. Record Extensions memory in `about:processes`
   immediately after inference, before five idle seconds elapse.
3. Stop from the popup. Confirm worker termination, no further audio, restored
   page and saved summary. After three seconds record Extensions memory again.
4. Start another session and confirm cached loading works; let the minute expire
   with the popup closed. Confirm worker/audio cleanup and exactly one diary entry.
5. Repeat stop during model loading, then immediately restart; confirm the new
   session works and no stale verdict or queued voice arrives.

## Download status (4.7)

The worker reports Transformers.js download events. The host filters them to
`loading`, `downloading`, `ready` or `error` with a bounded integer percentage or
null. No filenames, URLs, arbitrary downloader copy or task/page text enter the
status record. Events are deduplicated by displayed state/percentage. Chrome uses
an authenticated, per-request progress channel; its listener is removed when the
request settles. Firefox calls the same progress handler directly. Background
writes share the session queue and check the current session and generation, so
late progress cannot restore a stopped session's status.

`storage.local.modelDownload` contains `{sessionKey, state, percent}`. Start and
end clear it. Popup reopening reads it together with session state; readiness
hides it. A native, labelled progress bar has no value when the size is unknown.
Percentages explicitly describe the current file, never an invented aggregate or
remaining-time estimate. The UI explains the first Hugging Face download and
local processing. An error shows recovery instructions and leaves Stop available.
Cached model initialization may briefly show preparation; it does not claim a new
download. No separate onboarding download, model, host, dependency or asset added.

Latest combined checks are tracked in `docs/model-lifecycle-checks.json`.
After a real page triggered model readiness, Chrome RSS fell 344488 → 209952 KiB
(131.4 MiB) and Firefox 371900 → 184460 KiB (183.0 MiB). These warm-cache reruns
use the same isolated profiles after the earlier cold downloads. The harness
records real progress events, then tests popup states using a captured event in
a separate session; reloads cannot accidentally make idle release look like
session-end release. Error/unknown-size UI states are injected test fixtures,
not claims of a real network failure. Chrome additionally verifies that no
offscreen document remains after stop. The 51 unit tests pass.

### Exact first-run UI checks: Chrome

1. Build and load `dist/chrome` as above in a fresh test profile (or clear the
   extension's model Cache Storage using its DevTools Application panel).
2. Open a normal article without an allowlist/blocklist override, then start a
   session. Open the popup: expect “Butu is waking up…”, local-download copy,
   preparation followed by “Downloading… N% of this file”. Stop stays usable.
3. Close and reopen the popup during download; progress should reflect current
   work. After readiness it disappears and normal detection begins.
4. Stop during a download; status clears and the offscreen document closes.
   Restart with connectivity restored; model download/loading can begin again.
5. In a fresh test profile, disconnect the network before starting. Once loading
   fails, expect recovery instructions and no off-task punishment from failure.
   Reconnect, stop and restart to recover.
6. Start another session after a successful download; Network should show cached
   model files. Preparation may briefly appear; cached files need no redownload.

### Exact first-run UI checks: Firefox

1. Build and temporarily install `dist/firefox/manifest.json` in a fresh test
   profile (or clear model Cache Storage in the extension inspector's Storage tab).
2. Start a session on a normal article without a domain override. Open the popup;
   expect the same waking/preparation/per-file progress and privacy copy.
3. Close and reopen during download; confirm live progress, then disappearance
   on readiness and normal page detection.
4. Stop while loading. Confirm the worker terminates and status clears. Restart
   and confirm loading works again without stale progress from the old worker.
5. Disconnect before a fresh first download. Wait for failure; confirm recovery
   copy and usable Stop. Reconnect, stop and restart, then verify success.
6. Start another session with the model cached and confirm there is no remote
   model-file transfer. Brief cached preparation is expected.
