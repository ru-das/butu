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
extension copies; shipped source has no diagnostic endpoint. The probe compares
fixed synthetic text through the real client and stops through `session:stop`
immediately after inference, before the idle timer. RSS is read from `/proc`:
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
