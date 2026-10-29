# Phase 0.2–0.4 — Firefox and Chrome MV3 model tests

Run from the repository root:

```sh
sh experiments/phase0/prepare.sh
```

This copies the already-vendored runtime (including its licences) and the shared
model configuration into ignored directories inside this extension, and stages
the Chrome version in `experiments/phase0/chrome/`. Both versions use the exact
same `background.js` test runner. Re-run after editing the experiment,
`src/config.js` or the shared runtime wrapper. No install, bundler, server,
or additional dependency is needed.

The current rewrite cap is 25 tokens. Historical 0.2/0.4 measurements below used
48 tokens. See [memory experiments](MEMORY.md) for paired timings, worker teardown,
benchmark commands, and the remaining peak-memory blocker.
The current defaults are **paraphrase-MiniLM-L3-v2 q8** and **SmolLM2 MHA q8**.
See [model comparison](MODELS.md) for the cross-browser evidence and text-quality
limitations. Earlier measurements used MiniLM-L6 and SmolLM2 q4.

## Load and test in Firefox

1. Open `about:processes` and note the memory of **Extensions** (if present).
   This process can include other add-ons, so use a clean profile for useful numbers.
2. Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…**.
   Select `/home/rupam/butu/experiments/phase0/manifest.json`.
3. Find **Butu phase 0: Firefox model tests**, click **Inspect**, and select
   **Console**. Keep this toolbox open during the test. If Firefox shows the
   background as stopped, click **Start** first.
4. The test runs automatically when the background page loads. MiniLM runs first;
   wait for three `[phase0] Cosine similarity:` logs and
   `[phase0] Embedding ranking PASS`. Confirm the task is exactly
   `DBMS assignment on normalization` and both DBMS titles score higher than
   `IPL cricket highlights`. Nonfinite scores or wrong ordering log
   `[phase0] Embeddings FAILED:`. This is a ranking check, not threshold tuning.
   MiniLM is disposed before SmolLM2 loads, so the two models are never retained
   together. First use downloads model files;
   the current text model's `onnx/model_quantized.onnx` is about 137 MB.
   Wait for `[phase0] Output:` and `[phase0] Generation ms:`. If startup logs were
   missed, use the toolbox's **Reload** control and keep the toolbox open.
5. Verify the logged model is `onnx-community/SmolLM2-135M-Instruct-ONNX-MHA`,
   dtype `q8`. The only user message is exactly:
   `Rewrite as a sad little ghost would say it: Breaking news about cricket`.
   `[phase0] Raw output:` shows the actual generated response. `[phase0] Output:`
   prints its first nonempty trimmed line, with a template fallback if empty.
   Generation is greedy with a 25-token cap from `src/config.js`; this is a runtime
   test, not a guarantee of good ghost writing.
6. Record **Model load ms** separately from **Generation ms**. Generation time
   includes tokenization, inference and decoding, but excludes the model download
   and initialization. The first inference may include additional warm-up work.
7. With the toolbox still open, return to `about:processes`. Record the Extensions
   process memory and the difference from step 1. The model stays referenced for
   this check. This task does not establish background survival without DevTools;
   that is task 0.7.
8. In the extension toolbox **Network** panel, reload if necessary to capture
   requests. Runtime JS, the `.jsep.mjs` loader and `.wasm` must resolve to
   `moz-extension://…/vendor/`. Remote requests must be only Hugging Face model
   files and their `*.hf.co` download redirects. No prompt is sent to a server.
9. Click **Remove** in `about:debugging` after testing. Temporary add-ons are also
   removed when Firefox exits.

Errors appear as `[phase0] FAILED:` with the original error. An empty generated
response is visible in the raw log; the fallback is not evidence of generation.

## CSP and permissions

The manifest uses:

```text
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; connect-src 'self' https://huggingface.co https://*.hf.co
```

`wasm-unsafe-eval` permits the bundled ONNX Runtime to compile WASM; it does not
permit JavaScript `eval` or remote scripts. `connect-src` permits local WASM plus
the requested Hugging Face downloads, including its weight-file redirect hosts.
Public model files use CORS; no host permissions are requested. Firefox needs no
API permissions; Chrome requests only `offscreen`, as required for task 0.4.
Single-threaded WASM and no proxy worker reuse task 0.1's runtime configuration.

Firefox MV3 uses a nonpersistent background **document**, not a service worker.
See [MDN background](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)
and [MDN extension CSP](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy).

## Load and test in Chrome (116+)

1. Run `sh experiments/phase0/prepare.sh` from the repository root.
   Launch a separate Chrome test instance with the flag required by Chrome's
   `TESTING` offscreen reason (Linux example; use your Chrome executable):

   ```sh
   google-chrome --user-data-dir=/tmp/butu-phase0-manual --offscreen-document-testing
   ```

   On macOS, use `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome`;
   on Windows, pass the same flags to `chrome.exe`. A separate user-data directory
   ensures the flags reach a new process rather than an already-running Chrome.
2. Open Chrome Task Manager with **Shift+Esc**. Record the baseline memory;
   a clean profile gives the most useful comparison.
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**,
   and select `/home/rupam/butu/experiments/phase0/chrome/` (the directory).
   Do not select the Firefox experiment root.
4. On **Butu phase 0: Chrome model tests**, expand **Inspect views** and click
   **offscreen.html**. If it is not listed, open `chrome://inspect/#extensions`
   and inspect the matching offscreen document there. Its Console contains the
   model logs. The **service worker** console only reports host creation/errors.
   For missed logs, reload the extension and inspect the new offscreen document.
5. Wait for the three `[phase0] Cosine similarity:` lines and
   `[phase0] Embedding ranking PASS`. The task and titles must match Firefox
   step 4; both DBMS titles must beat cricket. Record model-load and embedding ms.
6. Wait for `[phase0] Raw output:`, `[phase0] Output:` and
   `[phase0] Generation ms:`. Verify the model, dtype and fixed prompt against
   Firefox step 5. Generation may take several minutes on this machine. Record
   load ms separately from generation ms. A fallback alone is not a successful
   inference; any `[phase0] FAILED:` or `Embeddings FAILED:` needs investigation.
7. Return to **Shift+Esc** and record the extension/offscreen process memory and
   delta from baseline after generation. Record any service worker separately;
   shared process memory includes runtime overhead. The generator remains loaded
   intentionally for this measurement. The existing Firefox result exceeded the
   spec's 500 MB budget, so report the actual number even if it is too high.
8. In offscreen DevTools **Network**, capture a reload if needed. Runtime JS,
   `.jsep.mjs` and `.wasm` must be under `chrome-extension://<ID>/vendor/`;
   remote traffic must be Hugging Face model files/`*.hf.co` redirects only.
   Neither fixed prompt nor comparison texts should be uploaded.
9. Remove the extension from `chrome://extensions` after recording results;
   this closes the offscreen host and releases its retained model.

Chrome-specific startup is isolated in `src/model-host/chrome-worker.js` and
`src/model-host/offscreen.html` inside this experiment, plus
`manifests/chrome.json`. The worker checks `runtime.getContexts()` before creating
the host, so a worker restart reuses it without rerunning inference. Chrome 116
is required for that API. The offscreen HTML imports the same runner Firefox's
background page uses; MiniLM is disposed before SmolLM2 loads in both browsers.

The offscreen reason is `TESTING` for this Phase 0 experiment. Chrome requires
the `--offscreen-document-testing` launch flag for this reason; without it the
worker logs `[phase0] Offscreen FAILED:` with that requirement. It avoids the
30-second silent-audio timeout of `AUDIO_PLAYBACK`; audio is task 0.6. This is
not a production lifetime strategy. See the
[Chrome offscreen API reference](https://developer.chrome.com/docs/extensions/reference/api/offscreen).
Model caching and Firefox background lifetime remain tasks 0.5 and 0.7.

Run the worker lifecycle regression check with `node --test tests/*.test.js`
from the repository root (Node 22 does not accept `tests/` as a test directory).

## Model credits

[SmolLM2-135M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct)
by Hugging Face, Apache-2.0; the experiment downloads the
[ONNX Community MHA export](https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX-MHA)
at the revision pinned in `src/config.js`. Model weights are not committed or
bundled. Runtime licences and credits are in [vendor/README.md](../../vendor/README.md).

[all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
by the Sentence Transformers contributors, Apache-2.0; historical tests downloaded
the [Xenova ONNX export](https://huggingface.co/Xenova/all-MiniLM-L6-v2), `q8`,
at the revision pinned in `src/config.js`. Mean pooling and normalization follow
that export's model card. Weights are not bundled or committed. All inference
uses the local vendored WASM runtime; no text is sent over the network.

The current embedding model is
[paraphrase-MiniLM-L3-v2](https://huggingface.co/sentence-transformers/paraphrase-MiniLM-L3-v2)
by the Sentence Transformers contributors, Apache-2.0, via the
[Xenova ONNX export](https://huggingface.co/Xenova/paraphrase-MiniLM-L3-v2), q8.
Its revision is pinned in `src/config.js`; mean pooling/normalization are used.
The optional benchmark also downloads Google's
[FLAN-T5-small](https://huggingface.co/google/flan-t5-small), Apache-2.0, via
[Xenova's export](https://huggingface.co/Xenova/flan-t5-small). It is not a default.

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
