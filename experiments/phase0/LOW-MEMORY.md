# Required open AI, embeddings only — 2026-10-29

The user approved retiring runtime text generation while retaining meaningful
open-model inference. The only active model is the pinned **MiniLM-L3 q8**.
It computes semantic task/page similarities; authored templates supply Butu's
on-page messages, stage-4 lines and diary copy. ElevenLabs voice/audio plans are
unchanged. No dependency, permission or network host was added.

This is the Phase 0 foundation and test fixture, not the completed extension UI.
Real tab verdict routing, threshold tuning, session lifecycle and the full copy
pack remain later plan tasks. The host caches scores, not invented verdicts;
there is no arbitrary detection threshold or rule-only substitute here.

## Runtime ownership and bounds

- `src/model-host/embedding-host.js` is shared by Firefox's background page and
  Chrome's offscreen document. It imports no Transformers.js/ONNX bundle.
- Construction loads no model. The first `compare(task, pages)` creates a single
  module worker. Only that worker imports the vendored runtime and loads MiniLM.
- One request runs at a time. At most four requests, including the active one,
  are retained; excess work rejects. The score cache is a 64-entry LRU map and
  returns copies of score arrays. Duplicate queued work can reuse a result.
- Task text is limited to 200 UTF-16 code units; each page string to 1,024; each
  request to three pages. Oversized/empty/malformed inputs reject before a worker
  is started. Tokenization truncates to 128 tokens and inference processes one
  string at a time. Vectors/scores are validated for dimensions and finite values.
- The pinned pipeline ignores per-call `max_length`; the worker caps its own
  tokenizer's `model_max_length` before its first inference instead.
- Five idle seconds terminate the worker. Valid cached scores remain available
  without restarting it. `release()` terminates the worker immediately, rejects
  pending work and clears the session cache. Worker errors/timeouts also terminate
  it and reject pending work. Replies from an older worker cannot complete a new
  request. The timeout is 120 seconds, including a first model download.
- Audio stays in the host document. Terminating inference does not close that
  document or its future audio playback. Chrome now uses the real `WORKERS`
  offscreen reason; `--offscreen-document-testing` is no longer required.

All limits and active model settings live in `src/config.js`. Historical text-model
settings remain in a clearly labelled benchmark-only section for reproducibility.
The normal entry points contain no text-generation call or generative-model load.
The separate, explicit historical benchmark can still reproduce those old runs.

`src/templates.js` contains original starter copy. `src/lib/templates.js` performs
bounded, nonrecursive interpolation and supplies safe defaults for missing values.
It returns plain text: future UI callers must use `textContent`. Voice templates
contain only `{task}`, never `{heading}`. The full task 3.6 pack is not claimed done.

## Browser verification

Chrome for Testing 153.0.8010.12 and Firefox 154.0.1 ran sequentially in isolated
profiles. Both used the normal entry point. The harness then exercised the three
relevance fixtures through the same public host, a 1,024-character related input,
oversize rejection and immediate cancellation/release. Kernel/process memory was
sampled, and a 30-second quiet window followed explicit release.

| Measurement | Chrome cold run | Chrome final fixture run | Firefox final fixture run |
| --- | ---: | ---: | ---: |
| Original model load | 8,027 ms | 1,096 ms | 1,505 ms |
| Original four-string inference, sequential | 325 ms | 95 ms | 61 ms |
| Largest observed individual renderer HWM | 446.5 MiB | 431.7 MiB | 349.1 MiB |
| Final renderer RSS after release/quiet window | 181.3 MiB | 167.9 MiB | 137.0 MiB |
| Final private-resident snapshot | 67.8 MiB | 56.8 MiB | 47.7 MiB |

The first Chrome run included the original fixture, cache/idle checks and a long
input. The final Chrome and Firefox runs additionally include all three relevance
fixtures and the exact 1,024-character boundary. The 128-token limit applies in
each case. Cold/warm histories differ; these are observations, not performance
guarantees. No forced GC was used. The Firefox process API snapshot before its
final screenshot reported 54,722,560 bytes (about 52.2 MiB); this is a different
metric/time from the final Linux RSS/private snapshots.

Both final runs passed:

- Required-model inference and original DBMS ranking.
- All three expanded ranking fixtures; all relevant titles outrank all unrelated
  titles within each fixture. No production threshold is claimed.
- Task-personalized authored text, cache hits, idle worker termination, cache hits
  after termination without a new worker, and explicit cache clearing on release.
- Long-input ranking, oversized-input rejection and active-request cancellation.

Original sequential-inference scores matched across browsers:

| Title | Cosine similarity |
| --- | ---: |
| Third normal form explained | 0.35404026839665215 |
| Functional dependencies tutorial | 0.2663538474806193 |
| IPL cricket highlights | 0.12826231421707068 |

These differ from earlier batched fixtures. Task 2.4 must tune the threshold using
the actual bounded, sequential detection path and real pages.

### What the 500 MB result does and does not establish

The final harnesses assert the 500,000,000-byte renderer target from config and
exit unsuccessfully if it is exceeded. This is a measured regression check, not
an allocation limiter. The tested individual inference renderers stayed below
500 MB, including the
long-input/reload/cancellation checks. This is not a universal whole-browser or
extension-process-group cap. The Chrome harness also sums all renderer processes
carrying `--extension-process`: the cold sampled sum reached **614.5 MiB**, while
the final run's sampled sum reached **430.8 MiB**. That candidate-process sum can
include startup/other renderer overhead and counts shared resident pages more than
once. We have not attributed it all to Butu; equally, it is not evidence for a
global 500 MB guarantee. Do not hide it by reporting only the smaller row.

Future popup/diary/audio/DOM effects are not implemented or included in this test.
The full-session target still needs measuring with those components. The browser
owns process allocation and reclamation, so extension code cannot enforce a
machine-independent whole-browser ceiling.

Firefox automation extends only its test profile's background idle timeout to
600,000 ms so a cold download can finish. It does not prove default lifetime or
complete task 0.7. Score caching is not model-file-cache verification (task 0.5),
and this is not the full network audit (task 4.9).

## Repeat automated checks

Requires Node 22 and, for browser sampling, Linux `/proc`, Chrome for Testing and
Firefox with Marionette. No third-party test packages are used. Run from root:

```sh
node --test tests/*.test.js
sh experiments/phase0/prepare.sh
BUTU_CHROME=/home/rupam/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
  node experiments/phase0/src/model-host/low-memory-check.cjs
python3 experiments/phase0/src/model-host/low-memory-firefox.py
```

Run browsers sequentially. Output defaults to `/tmp/butu-low-memory-chrome` and
`/tmp/butu-low-memory-firefox`; set `BUTU_MEMORY_RESULTS` to a separate directory
for another capture. Each harness uses only its own profile/temporary extension
copy and checks browser identity. The Firefox harness uses local port 2839; do
not run two copies concurrently. Neither harness opens a personal profile.

The fixture uses a fixed synthetic task/title set. The harness adds diagnostic
calls only in its temporary copy; the shipped source has no telemetry or external
test endpoint. Both browser instances are closed after capture.

## Manual load/test steps

### Chrome

1. Run `sh experiments/phase0/prepare.sh` and open Shift+Esc to note baseline memory.
2. Open `chrome://extensions`, enable Developer mode, Load unpacked
   `/home/rupam/butu/experiments/phase0/chrome/`. No special Chrome launch flag.
3. Inspect `offscreen.html` (or use `chrome://inspect/#extensions`). Expect the
   MiniLM-L3 q8 header, three similarity scores, `Embedding ranking PASS` and
   task-personalized `Template:` lines. No generative model should load.
4. Expect `Score cache PASS`, then after five idle seconds `Idle teardown PASS`
   and `Result:` with `passed: true` and `released: true`. Record active/idle memory.
   Final idle snapshots are not peak measurements; use the harness for peaks.
5. Remove the extension after testing.

### Firefox

1. Run the same prepare command; note Extensions memory in `about:processes`.
2. In `about:debugging` → This Firefox → Load Temporary Add-on, select
   `/home/rupam/butu/experiments/phase0/manifest.json`.
3. Immediately click Inspect and keep it open. Expect the same model, ranking,
   template, cache, teardown and released-result logs as Chrome.
4. Record Extensions memory during inference and after teardown in
   `about:processes`. Remove the temporary add-on afterwards.

## Evidence and provenance

Captured data is in [results/2026-10-29-embedding-only](results/2026-10-29-embedding-only/):

- [Chrome cold](results/2026-10-29-embedding-only/chrome-cold.json),
  [Chrome final](results/2026-10-29-embedding-only/chrome-final.json).
- [Firefox cold capture](results/2026-10-29-embedding-only/firefox-cold.json),
  [Firefox final budget check](results/2026-10-29-embedding-only/firefox-result.json),
  [before](results/2026-10-29-embedding-only/firefox-before.png),
  [after](results/2026-10-29-embedding-only/firefox-after.png).

Model/runtime licences and credits are in [README.md](README.md). The templates
are authored Butu copy; the screenshots are locally generated test evidence,
not bundled runtime assets. No ElevenLabs calls or characters were used here.
