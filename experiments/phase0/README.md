# Phase 0.2 — Firefox MV3 text generation

Run from the repository root:

```sh
sh experiments/phase0/prepare.sh
```

This copies the already-vendored runtime (including its licences) and the shared
model configuration into ignored directories inside this extension. Re-run after
editing `src/config.js` or the shared runtime wrapper. No install, bundler, server,
or additional dependency is needed.

## Load and test in Firefox

1. Open `about:processes` and note the memory of **Extensions** (if present).
   This process can include other add-ons, so use a clean profile for useful numbers.
2. Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…**.
   Select `/home/rupam/butu/experiments/phase0/manifest.json`.
3. Find **Butu phase 0: Firefox text generation**, click **Inspect**, and select
   **Console**. Keep this toolbox open during the test. If Firefox shows the
   background as stopped, click **Start** first.
4. The test runs automatically when the background page loads. First use downloads
   model files; `onnx/model_q4.onnx` alone is 182,400,492 bytes (about 174 MiB).
   Wait for `[phase0] Output:` and `[phase0] Generation ms:`. If startup logs were
   missed, use the toolbox's **Reload** control and keep the toolbox open.
5. Verify the logged model is `onnx-community/SmolLM2-135M-Instruct-ONNX-MHA`,
   dtype `q4`. The only user message is exactly:
   `Rewrite as a sad little ghost would say it: Breaking news about cricket`.
   `[phase0] Raw output:` shows the actual generated response. `[phase0] Output:`
   prints its first nonempty trimmed line, with a template fallback if empty.
   Generation is greedy with a 48-token cap; this is a runtime test, not a guarantee
   of good ghost writing.
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
Public model files use CORS; no API permissions or host permissions are requested.
Single-threaded WASM and no proxy worker reuse task 0.1's runtime configuration.

Firefox MV3 uses a nonpersistent background **document**, not a service worker.
See [MDN background](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)
and [MDN extension CSP](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy).

## Chrome

This experiment is Firefox-only. Chrome generation via an offscreen document is
task 0.4. For the existing runtime regression check in Chrome, follow
[vendor/README.md — Chrome](../../vendor/README.md#chrome): prepare its temporary
fixture, load it at `chrome://extensions` → **Load unpacked**, open
`chrome-extension://<ID>/tests/vendor-smoke.html`, and expect `PASS` and `23`.
Do not use this Firefox manifest to test Chrome generation.

## Model credits

[SmolLM2-135M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct)
by Hugging Face, Apache-2.0; the experiment downloads the
[ONNX Community MHA export](https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX-MHA)
at the revision pinned in `src/config.js`. Model weights are not committed or
bundled. Runtime licences and credits are in [vendor/README.md](../../vendor/README.md).

## Observed result (2026-10-29)

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
The visible `about:processes` comparison remains a manual check using steps 1/7.
JS/shell syntax, manifest JSON, staged file copies and vendor checksums also passed.
