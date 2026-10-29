# Memory experiments — 2026-10-29

**Historical experiment:** normal entry points now use only the bounded embedding
worker and templates. See [the current implementation](LOW-MEMORY.md). Text-model
cases below are opt-in research tooling, not normal extension behavior.

These historical trials used MiniLM-L6 and SmolLM2 q4. The subsequent
[model comparison](MODELS.md) selected L3/q8 defaults. The legacy matrix cases
in the benchmark explicitly select the original baselines for reproducibility.

The 25-token cap is faster in paired calls and preserves the complete first line
of the fixed prompt. Worker teardown releases most retained memory in both
browsers. **None of the tested changes meets the 500 MB peak-memory target.**

The pinned models, quantization, WASM thread count and ONNX settings are unchanged.
The rewrite cap is now `TEXT_MAX_NEW_TOKENS = 25` in `src/config.js`. The normal
Phase 0 fixture still retains its generator for the original memory check.
Worker teardown is an executable benchmark prototype, not a completed production
session lifecycle.

## Allocation and isolation

Each Chrome case started a fresh browser process and host, sequentially. These
are single trials, not medians. Previously used profiles supplied cached files;
the first cases also included downloads. The machine used swap, so lower RSS
alone is not proof of release. Loading times are not directly comparable.

| Chrome case | Largest renderer HWM observed at phase checkpoints | Generation |
| --- | ---: | ---: |
| MiniLM alone | 468 MiB | Embedding: 304 ms |
| SmolLM2 alone, default settings, 48 tokens | 1,188 MiB | 27.6 s |
| MiniLM disposed, then SmolLM2, 48 tokens | 1,502 MiB | 42.9 s |
| Basic graph optimization, 48 tokens | 1,414 MiB | 59.6 s |
| Prepacking disabled, 48 tokens | 1,420 MiB | 56.7 s |
| SmolLM2 alone, 25 tokens, fresh host | 1,522 MiB | 29.6 s |

Basic graph optimization and disabled prepacking showed no promising reduction
and were slower in these trials; neither was adopted. Shorter output did not
fix first-call or loading memory. SmolLM2 exceeded 500 MB before generation in
every text-model trial. Earlier MiniLM allocations are not the sole cause.

`dispose()` helped MiniLM but did not reliably return SmolLM2 memory to the OS:
the text-only 48-token renderer remained around 937 MiB RSS after disposal and
a five-second wait.

## Paired output lengths

One loaded pipeline generated the fixed prompt six times, alternating caps.
Every call returned the same complete first line. Each 25-token call was faster
than its immediately preceding 48-token call:

| Pair | 48 tokens | 25 tokens | Wall-time reduction |
| --- | ---: | ---: | ---: |
| 1, includes initial warm-up | 40.445 s | 18.926 s | 53% |
| 2 | 36.223 s | 18.430 s | 49% |
| 3 | 24.295 s | 12.930 s | 47% |

The cap stops repeated trailing text sooner. This establishes a latency benefit
for this prompt, not quality on other prompts or a lower model-loading peak.

## Worker teardown

Inference ran in a dedicated module worker using the same runtime/model. The
document retained only plain phase/result messages. After generation the worker
disposed its pipeline, then the document terminated it and waited 30 seconds.
No forced GC was used for the following idle checkpoints.

| Measurement | Chrome 153.0.8010.12 | Firefox 154.0.1 |
| --- | ---: | ---: |
| 25-token generation | 14.378 s | 14.717 s |
| RSS after disposal, before teardown | 946 MiB | 1,009 MiB |
| RSS after teardown and 30 seconds | 125 MiB | 115 MiB |
| Private resident memory after 30 seconds | 24 MiB | 34 MiB |
| Swap after 30 seconds | 28 MiB | 25 MiB |
| Largest observed kernel renderer HWM | 1,209 MiB | 1,045 MiB |

Chrome's private-resident-plus-swap footprint fell from about 1,012 MiB before
termination to 52 MiB at the final checkpoint, supporting actual release rather
than merely paging the model out. A separate five-second worker trial still
had about 595 MiB RSS; reclamation timing varies.

Firefox's final `about:processes` UI displayed **33 MB**; its process API reported
**34,332,672 bytes**. This is resident-unique memory, whereas Linux RSS includes
shared pages. See Mozilla's
[process-monitor change](https://bugzilla.mozilla.org/show_bug.cgi?id=1652813).
The Firefox test profile used a 600,000 ms background idle timeout; default
background lifetime remains task 0.7.

Worker teardown helps idle/session-end memory but does not solve peak loading.
The next investigation is the model export/load path, including temporary weight
copies and graph transformations. No export, runtime upgrade, model change or
new dependency was introduced here.

## Reproduce on Linux

The Chrome driver needs Node 22, Chrome for Testing with the extension-debugging
API, and readable `/proc/<pid>/status` and `smaps_rollup`. From the repo root:

```sh
sh experiments/phase0/prepare.sh
BUTU_CHROME=/home/rupam/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
  node experiments/phase0/src/model-host/memory-benchmark.cjs
```

Append case names to run a subset, e.g. `paired-output-length worker-text-25-long-idle`.
Do not run two copies concurrently. The driver uses `/tmp/butu-memory-fixture`,
its own `/tmp/butu-memory-chrome-profile`, and debug port 9347. A fresh headless
browser is launched/closed per case. Only the temporary offscreen HTML changes;
the normal host and personal browser profiles are untouched. Results default to
`/tmp/butu-memory-results`; override with `BUTU_MEMORY_RESULTS` to preserve runs.

Each phase pauses one second for a checkpoint; timings exclude these pauses.
Memory is sampled every 500 ms. Raw `peakRssKiB`/`peakPrivateKiB` sum candidate
extension renderers, including spare renderers. The table above instead uses
the largest individual `highWaterKiB` at phase checkpoints. Do not compare the
summed RSS field to a single Task Manager row. Forced GC is separately labelled
after the natural idle window and excluded from the worker idle figures above.

For a visible Chrome worker check, run any benchmark case first to prepare the
fixture. Launch a separate Chrome instance with `--offscreen-document-testing`
as in the main README, load unpacked `/tmp/butu-memory-fixture`, inspect
`offscreen.html`, and run this in its Console:

```js
startMemoryCase({ text: true, tokens: 25, worker: true,
                  idleDelays: [5000, 10000, 15000] });
```

Expect `text-generated` with the same first line, then `text-disposed`,
`worker-terminated`, three `idle` events, and `settled`. Compare Shift+Esc memory
before loading and after `settled`.

For Firefox, after preparing, create a temporary fixture:

```sh
fixture=$(mktemp -d /tmp/butu-memory-firefox-manual.XXXXXX)
cp experiments/phase0/manifest.json experiments/phase0/background.html "$fixture/"
cp -R experiments/phase0/src experiments/phase0/vendor "$fixture/"
cat > "$fixture/background.js" <<'JS'
import './src/model-host/memory-host.js';
await startMemoryCase({ text: true, tokens: 25, worker: true,
                        idleDelays: [5000, 10000, 15000] });
JS
printf '%s\n' "$fixture"
```

Record Extensions memory in `about:processes`. In `about:debugging` → This Firefox
→ Load Temporary Add-on, select the printed directory's `manifest.json`.
Immediately click Inspect and keep it open while the model runs. Expect the same
phase events/first line as Chrome. After `settled`, record Extensions memory in
`about:processes` again. Remove the temporary add-on afterwards. These manual
steps keep Inspect open instead of changing the background idle preference.

## Evidence

Captured data is in [results/2026-10-29-memory](results/2026-10-29-memory/):

- [Baseline](results/2026-10-29-memory/text-48.json),
  [sequential models](results/2026-10-29-memory/sequential-48.json),
  [basic graph](results/2026-10-29-memory/text-basic-48.json),
  [no prepacking](results/2026-10-29-memory/text-no-prepack-48.json).
- [Paired caps](results/2026-10-29-memory/paired-output-length.json),
  [Chrome worker](results/2026-10-29-memory/worker-text-25-long-idle.json),
  [Firefox worker samples](results/2026-10-29-memory/firefox-worker-result.json).
- Firefox `about:processes`: [before](results/2026-10-29-memory/firefox-worker-before.png),
  [after](results/2026-10-29-memory/firefox-worker-after.png).

Screenshots are locally generated test evidence, not runtime assets.
This follows up task 0.4; no later task was checked off.
