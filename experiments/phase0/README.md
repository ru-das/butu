# Phase 0 — required open embeddings and authored Butu text

Run from the repository root:

```sh
sh experiments/phase0/prepare.sh
```

The Firefox background page and Chrome offscreen document run the same test.
The normal entry point loads only **paraphrase-MiniLM-L3-v2 q8** in a dedicated
worker, computes real semantic similarities, and personalizes authored text.
It never loads SmolLM2 or FLAN-T5. There is no generative text call or cloud
substitute. [Implementation, bounds and measurements](LOW-MEMORY.md).

Preparation copies the canonical `src/`, vendored runtime and its licences into
ignored staging directories. Re-run after source changes. No packages, bundler,
additional permissions or new network hosts are needed.

For task 0.6's message-triggered MP3 probe, browser steps and recorded results,
see [AUDIO.md](AUDIO.md).

For task 0.7's Firefox session-scoped heartbeat, endurance test and remaining
full-product lifecycle limits, see [LIFETIME.md](LIFETIME.md). Its probe is
Firefox-only and stays inactive until explicitly started.

## Load and test in Chrome (116+)

1. Open Shift+Esc and note the baseline memory. Use a clean test profile.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**,
   and select `/home/rupam/butu/experiments/phase0/chrome/`.
3. Inspect **offscreen.html** through Inspect views or `chrome://inspect/#extensions`.
   The service-worker console only reports creation/errors. No special launch flag
   is required: the offscreen reasons are `WORKERS` and `AUDIO_PLAYBACK`; the
   document hosts inference workers and bundled audio.
4. Expect the required open-model header, three cosine scores and
   `Embedding ranking PASS`. Both DBMS headings must outrank cricket.
5. Expect personalized `Template:` lines, `Score cache PASS`, then, after five
   idle seconds, `Idle teardown PASS` and a `Result:` object with `passed: true`.
   The final object also confirms explicit session release cleared cached scores.
   There should be no generative-model loading/output logs.
6. Record active/idle memory in Shift+Esc. The model worker unloads automatically;
   do not interpret the final idle number as its peak. The automated verifier
   below records kernel high-water marks. Remove the test extension afterwards.

## Load and test in Firefox

1. Run the same prepare command and note Extensions memory in `about:processes`.
2. In `about:debugging` → This Firefox → **Load Temporary Add-on**, select
   `/home/rupam/butu/experiments/phase0/manifest.json`.
3. Immediately click **Inspect**, keep it open, and check the same model header,
   ranking, template, cache, teardown and `passed: true` logs as Chrome.
4. Record Extensions memory during inference and after idle in `about:processes`.
   It should drop after worker termination. Remove the temporary add-on.

Keeping Inspect open avoids confusing this test with task 0.7's background-page
lifetime investigation. For model-file persistence across extension reload, see [task 0.5](CACHE.md).
A failed model request logs `[phase0] FAILED:` and releases the worker; template
output alone is not a passing open-AI demonstration.

## Automated checks

```sh
node --test tests/*.test.js
sh experiments/phase0/prepare.sh
BUTU_CHROME=/home/rupam/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
  node experiments/phase0/src/model-host/low-memory-check.cjs
python3 experiments/phase0/src/model-host/low-memory-firefox.py
```

Run browser checks sequentially. Both use isolated test profiles; the Firefox
harness extends only its test-profile idle timeout. See [LOW-MEMORY.md](LOW-MEMORY.md)
for results, output paths and limits. Scores are cached locally in a bounded
session map; this is separate from model-file caching and from the future
per-URL verdict cache/threshold in tasks 2.3–2.4.

## CSP, permissions and credits

CSP remains `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src
'none'; connect-src 'self' https://huggingface.co https://*.hf.co`.
Chrome requests only `offscreen`; Firefox requests no API permission. No host
permission is added. Runtime JS/WASM comes from bundled `vendor/`, never a CDN.

[paraphrase-MiniLM-L3-v2](https://huggingface.co/sentence-transformers/paraphrase-MiniLM-L3-v2)
is by Sentence Transformers contributors, Apache-2.0, via
[Xenova's ONNX export](https://huggingface.co/Xenova/paraphrase-MiniLM-L3-v2).
Revision/dtype and limits live in `src/config.js`. Runtime licences are in
[vendor/README.md](../../vendor/README.md). The starter template copy is original
Butu text. The original bundled test chime has [CC0 credits](../../assets/audio/README.md).

## Historical experiments

The results below and [MEMORY.md](MEMORY.md)/[MODELS.md](MODELS.md) describe earlier
q4/q8 generative and L6 comparisons. The retained `memory-benchmark.cjs` cases are
**opt-in historical tooling**; do not use them to measure the current normal
embedding-only path. Original model credits and revisions remain in those reports.

## Task 0.3 observed result (2026-10-29)

Verified in Firefox 154.0.1, headless, using a temporary copy with console capture
and the same 300,000 ms background idle timeout described below. Only test-profile
preferences were changed; keep Inspect open when testing manually.

Task: `DBMS assignment on normalization`

| Comparison | Cosine similarity |
| --- | ---: |
| Third normal form explained | 0.2680489593482574 |
| Functional dependencies tutorial | 0.1735348755381003 |
| IPL cricket highlights | 0.059710662257280285 |

Embedding model load including first download: **26,046 ms**.
Embedding inference for all four strings including tokenization, pooling and
normalization: **127 ms**. Ranking check passed. These three examples do not
establish a production threshold (task 2.4).

The extension process reported 228,970,496 bytes (218.4 MiB) just after the
embedding check; MiniLM had already been disposed and SmolLM2's download had
started, so this is not a MiniLM peak-memory measurement. The automated run
stopped there; task 0.2's generation result below is from its earlier run.
Chrome's task 0.4 result is recorded below.

## Task 0.4 observed result (2026-10-29)

Verified in Chrome for Testing 153.0.8010.12, headless, with an isolated profile,
`--offscreen-document-testing`, and DevTools Protocol console capture attached to
the actual offscreen document. The service worker created the document; both
models ran there using the unchanged Firefox runner and shared configuration.

All three cosine similarities matched Firefox's task 0.3 values above exactly;
the embedding ranking check passed. Embedding model load including download:
**19,777 ms**; embedding inference: **616 ms**.

```text
Model load ms: 243929
Output: The cricket was a sad little ghost, a lonely soul, a ghost of a day.
Generation ms: 35022
```

SmolLM2 load time includes its initial download and initialization; it is separate
from generation. The raw response repeated “Rewritten as…” after the first line,
just as in Firefox. This proves runtime equivalence, not production text quality.
No cache-reload test was performed (task 0.5).

The graphical follow-up below records the visible Chrome Task Manager memory.
The worker lifecycle regression, manifest/staging checks, JS/shell syntax,
vendor checksums and `git diff --check` passed. Firefox's test runner and manifest
are unchanged; its browser results remain those recorded for tasks 0.2/0.3.

## Task 0.2 observed result (2026-10-29)

Verified in Firefox 154.0.1, headless, using a temporary copy with console capture.
The test profile extended `extensions.background.idle.timeout` to 300,000 ms;
the shipped extension does not change this preference. Keep Inspect open for the
manual test above. Without that protection the background stopped during the
initial model download. Background lifetime still needs task 0.7's investigation.

```text
Model load ms: 8085
Output: The cricket was a sad little ghost, a lonely soul, a ghost of a day.
Generation ms: 259685
```

This run followed a completed model download; it is not a cold-download timing
or task 0.5's cache verification. An earlier cold load took 55,951 ms.
The raw response continued with repeated “Rewritten as…” text; the output log
correctly selected the first line. Quality is weak and CPU generation is slow;
these results do not establish acceptable product performance.

Firefox's process-info API (`ChromeUtils.requestProcInfo`, also used by
`about:processes`) reported 845,713,408 bytes (806.5 MiB) for the extension process
after generation. This includes process/runtime overhead, not only model weights.
The graphical follow-up below also records the visible `about:processes` comparison.
JS/shell syntax, manifest JSON, staged file copies and vendor checksums also passed.

## Graphical verification follow-up (2026-10-29)

Both browser tests were run sequentially in isolated Xvfb displays, with their
actual process-monitor windows captured before and after generation. The Chrome
offscreen document ran the unchanged test runner. Firefox used a temporary copy
with console/fetch logging; its test-profile background idle timeout was extended
to 600,000 ms so inference could finish. This does not verify task 0.7's background
lifetime under default preferences. Production files and model choices are unchanged.

| Measurement | Chrome for Testing 153.0.8010.12 | Firefox 154.0.1 |
| --- | ---: | ---: |
| Embedding model load | 1,485 ms | 1,287 ms |
| Embedding inference | 56 ms | 79 ms |
| SmolLM2 model load | 9,316 ms | 6,592 ms |
| Generation | 25,350 ms | 27,239 ms |
| Post-generation process memory | Task Manager: 968,112K (about 945 MiB) | Process API: 1,092,608,000 bytes (about 1,042 MiB); UI rounds to 1GB |

Both embedding ranking checks passed with the exact three scores recorded above.
Both generated the same first line:
`The cricket was a sad little ghost, a lonely soul, a ghost of a day.`
These timings are repeat-run observations with previously used test profiles,
not cold-download timings or a completed cache audit (task 0.5).

Chrome's baseline Task Manager had no Butu process; after generation the Butu row
was PID 68126. Firefox's Extensions process, PID 67231, rose from a displayed
43MB baseline to a displayed 1GB. These are whole-process measurements, including
runtime overhead; Chrome's memory-footprint column and Firefox's resident-unique
process measurement are different metrics. They are post-generation snapshots, not
comparable model-only peaks. **Both exceed the spec's 500 MB memory budget.**

Evidence (locally generated screenshots and captured test results):

- Chrome Task Manager: [before](results/2026-10-29/chrome-before.png),
  [after](results/2026-10-29/chrome-after.png), [console/process data](results/2026-10-29/chrome.json).
- Firefox `about:processes`: [before](results/2026-10-29/firefox-before.png),
  [after](results/2026-10-29/firefox-after.png), [console/process data](results/2026-10-29/firefox.json).

The captured Chrome offscreen network requests were extension-local ONNX Runtime
loader/WASM GETs. This follow-up is not the complete cold/warm network audit in
task 4.9. Both temporary browser instances and virtual displays were closed after
capture. No next task was checked off.
