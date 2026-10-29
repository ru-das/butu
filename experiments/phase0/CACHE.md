# Task 0.5 — model files survive extension reload

This checks the selected MiniLM-L3 q8 model, pinned in `src/config.js`.
Transformers.js 3.8.1 already uses the browser Cache API (`transformers-cache`);
no runtime change, permission, dependency or network host is needed.
This persistent file cache is separate from the host's in-memory score cache.

## Observed result — 2026-10-29

| Browser | Cold load ms | Reload load ms | Remote model fetches, cold → reload | Reload cache hits |
| --- | ---: | ---: | ---: | ---: |
| Chrome for Testing 153.0.8010.12 | 14,572 | 854 | 4 → 0 | 4 |
| Firefox 154.0.1 | 7,706 | 1,309 | 4 → 0 | 4 |

Both cold and reloaded runs passed real embedding inference, ranking and worker
release. Chrome used the same Reload API as `chrome://extensions`; Firefox used
`AddonManager`'s actual add-on reload. Chrome's offscreen target changed across
reload. Each worker loaded the model again; no in-memory model/score reuse could
explain the result. The second load had zero remote model requests: Chrome's
host Network capture contained no HTTP(S) URLs and Firefox's browser-wide Hugging
Face HTTP observer recorded zero requests. Worker instrumentation independently
confirmed zero remote fetch calls and four successful Cache API reads.

Both profiles retained exactly **18,164,778 bytes** across these four entries:

| File | Cached bytes |
| --- | ---: |
| `config.json` | 657 |
| `tokenizer_config.json` | 366 |
| `tokenizer.json` | 711,649 |
| `onnx/model_quantized.onnx` | 17,452,106 |

Evidence: [Chrome](results/2026-10-29-cache/chrome.json),
[Firefox](results/2026-10-29-cache/firefox.json). Timings include initialization
and are observations, not performance guarantees. Both tests were headless;
network evidence is protocol/HTTP observation, not a screenshot of the GUI tab.

An initial Chrome harness attempt omitted Developer mode in its fresh profile:
CDP permitted the initial load, but Chrome disabled the extension on reload with
`unsupportedDeveloperExtension`. The passing run enables Developer mode before
reload, matching the manual setup. No runtime workaround was added.

## Repeat the browser audit

From the repository root, with Node 22, Firefox and Chrome for Testing installed:

```sh
sh experiments/phase0/prepare.sh
BUTU_CHROME=/home/rupam/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
  node experiments/phase0/src/model-host/cache-check.cjs
python3 experiments/phase0/src/model-host/cache-firefox.py
```

Run browsers sequentially. Each requires a fresh output/profile directory; set
`BUTU_CACHE_RESULTS=/tmp/butu-cache-another-run` to repeat. Defaults are
`/tmp/butu-cache-chrome` and `/tmp/butu-cache-firefox`. No personal profile is used.
Firefox uses local Marionette port 2840 and extends only the test profile's
background idle timeout; this does not complete task 0.7.

The scripts copy the prepared extension and add `cache-probe.js` only to that
temporary worker. It records every remote `fetch` and Cache API match, then sends
those diagnostics with the worker result. Normal entry points never import it.
A cold run must download the model. The harness then reloads the extension,
requires successful inference from a new worker, and checks all four cache hits,
zero misses, zero remote fetch calls and nonempty cached weight bytes.
Chrome enables Developer mode before invoking the Reload API and records
DevTools Network events on the host; Firefox observes
Hugging Face HTTP requests browser-wide. The worker probe covers early requests
before the host debugger attaches. Results are written to `result.json`.

## Manual check in Chrome

1. Run `sh experiments/phase0/prepare.sh`. In a test profile, visit
   `chrome://extensions`, enable Developer mode and **Load unpacked**
   `/home/rupam/butu/experiments/phase0/chrome/`.
2. Wait for the first run to finish. Inspect **offscreen.html** through Inspect
   views or `chrome://inspect/#extensions`. Its Console must show
   `Embedding ranking PASS` and `Result:` with `passed: true`.
3. In that Console, run the cache listing below. You must see all four files,
   including `model_quantized.onnx` with 17,452,106 bytes. You can also inspect
   **Application → Cache Storage → transformers-cache** (refresh the cache list).
4. Click this extension's **Reload** button in `chrome://extensions`. Keep the
   same loaded path/profile; do not remove and reinstall it. Reinspect the new
   **offscreen.html**, and wait for `passed: true` again.
5. Open **Network**, enable recording, select **All**, clear the log, and leave
   **Disable cache** unchecked. Run the fresh-worker command below in Console.
   This is necessary if DevTools missed the automatic load during reload.
6. Confirm `cached: false`, finite similarity scores, and **no remote model
   requests** in Network. Filter for `huggingface`, `hf.co`, `onnx` and `json`;
   inspect the full URL because the bundled runtime also has local ONNX filenames.
   Local `chrome-extension://` JS/WASM loads are expected. Repeat the cache
   listing: the same four files must remain. Save a HAR if you want a record.

## Manual check in Firefox

1. Run the prepare command. In a test profile, open `about:debugging` →
   **This Firefox** → **Load Temporary Add-on** and select
   `/home/rupam/butu/experiments/phase0/manifest.json`.
2. Immediately click **Inspect**, keep it open, and wait for
   `Embedding ranking PASS` and `Result:` with `passed: true`. Keeping the
   inspector open avoids mixing this check with the background-lifetime task.
3. Run the cache listing in the extension Console. Check the same four files
   and weight bytes. Use this listing if Firefox's Storage panel does not expose
   extension Cache Storage.
4. Click **Reload** for Butu in `about:debugging` (do not Remove/Load Temporary
   Add-on). Reconnect **Inspect** if necessary; wait for `passed: true` again.
5. Open the extension debugger's **Network** panel (enable it in toolbox settings
   if hidden), enable recording, select **All**, clear the log and leave
   **Disable HTTP Cache** unchecked. Run the fresh-worker command below.
6. Confirm `cached: false`, finite scores, and **no remote model requests** under
   the same filters. `moz-extension://` JS/WASM loads are expected. List the cache
   again and check that all four files survived the reload. Save a HAR if desired.

Use the extension host's Console/Network panel in both browsers, rather than a
normal web page's DevTools or Chrome's service-worker Console. An empty Network
panel opened after inference is not evidence. The forced fresh worker below
starts a real model load while recording, after the actual extension reload.
`release()` clears session scores and terminates the previous worker; therefore
this cannot pass by reusing an in-memory model or cached similarities.

Cache listing (both browsers):

```js
var modelCache = await caches.open('transformers-cache');
console.table(await Promise.all((await modelCache.keys()).map(async request => ({
  url: request.url,
  bytes: (await (await modelCache.match(request)).arrayBuffer()).byteLength,
}))));
```

Fresh-worker command (both browsers; wait for the normal run to finish first):

```js
phase0Host.release();
await phase0Host.compare('DBMS assignment on normalization', [
  'Third normal form explained',
  'Functional dependencies tutorial',
  'IPL cricket highlights',
]);
```

For a cold-download control with Network already recording, use **only a disposable
test profile**: after the normal run finishes, call `phase0Host.release()`, then
`await caches.delete('transformers-cache')`, then run the fresh-worker command.
The four Hugging Face downloads should appear. Let them finish, reload the
extension and perform the warm check above. Do not delete the cache between the
cold and warm checks. An HTTP/disk-cache or 304 model request is not the target
result: the warm path should make no remote request at all.

Cache Storage belongs to this browser profile and extension origin. Reload is
expected to retain it; uninstalling, clearing extension/site data, changing the
extension identity/profile, changing model/revision/dtype or browser eviction can
require another download. This task verifies reload, not indefinite retention or
the full privacy audit in task 4.9.
