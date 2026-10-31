# Vendored browser runtime (task 0.1)

Pinned versions, not a floating CDN import:

- **@huggingface/transformers 3.8.1**, Apache-2.0, Hugging Face.
  Official npm archive: https://registry.npmjs.org/@huggingface/transformers/-/transformers-3.8.1.tgz
  Upstream revision: `2ec882e739e4cb461f8d440d4d7394cbf5372429`.
- **onnxruntime-web 1.22.0-dev.20250409-89f8206ba4**, MIT, Microsoft.
  This is the exact dependency pinned by Transformers.js 3.8.1, not an independently selected ORT release.
  Official npm archive: https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-1.22.0-dev.20250409-89f8206ba4.tgz

## Files and provenance

All three runtime files originate from `package/dist/` in the Transformers.js
archive. Before the CSP patches below, the two ORT files were also compared
byte-for-byte with `package/dist/` in the matching ONNX Runtime archive: identical.

| Local file | Archive member | Upstream bytes before patches |
| --- | --- | ---: |
| transformers.js | package/dist/transformers.js | 2253735 |
| ort-wasm-simd-threaded.jsep.mjs | package/dist/ort-wasm-simd-threaded.jsep.mjs | 44484 |
| ort-wasm-simd-threaded.jsep.wasm | package/dist/ort-wasm-simd-threaded.jsep.wasm | 21596019 |

`transformers.js` is the self-contained browser ES module, including ONNX Runtime's
JavaScript glue. The `transformers.web.js` build has bare package imports and is
unsuitable for this no-bundler extension. Source maps, Node builds, extra ORT
variants and model weights are deliberately omitted. The SIMD/threaded-named
binary also supports the configured single-thread execution.

Licences/credits:

- `LICENSE-transformers.txt`: `package/LICENSE` from the Transformers.js archive.
  Copyright/licence comments in the browser bundle are preserved.
- `LICENSE-onnxruntime.txt`: https://raw.githubusercontent.com/microsoft/onnxruntime/89f8206ba4/LICENSE
- `ThirdPartyNotices-onnxruntime.txt`: https://raw.githubusercontent.com/microsoft/onnxruntime/89f8206ba4/ThirdPartyNotices.txt

The archive SHA-512 values were checked against the official npm registry metadata
before extraction:

```text
transformers-3.8.1.tgz
sha512-tsTk4zVjImqdqjS8/AOZg2yNLd1z9S5v+7oUPpXaasDRwEDhB+xnglK1k5cad26lL5/ZIaeREgWWy0bs9y9pPA==
onnxruntime-web-1.22.0-dev.20250409-89f8206ba4.tgz
sha512-0uS76OPgH0hWCPrFKlL8kYVV7ckM7t/36HfbgoFw6Nd0CZVVbQC4PkrR8mBX8LtNUFZO25IQBqV2Hx2ho3FlbQ==
```

`SHA256SUMS` covers the bundled runtime and licence files. Verify from this directory
with `sha256sum -c SHA256SUMS`.

## Extension CSP patches

Run `python3 scripts/patch-vendor.py` from the repository root after extracting
the pinned upstream files. It applies exact, idempotent replacements:

- In both JavaScript bundles, replace the legacy `Function("return this")`
  global-object fallback with `globalThis`, which all supported browsers provide.
- In `transformers.js`, replace ONNX's variable module import with the literal
  `./ort-wasm-simd-threaded.jsep.mjs`. Reject any requested loader URL that does
  not resolve to that bundled file. Butu uses only this WASM backend with one
  thread and no proxy; arbitrary loader overrides are intentionally unsupported.

The WASM binary and licence files remain unchanged. `SHA256SUMS` records the
patched JavaScript hashes. No CSP relaxation, remote script execution or new
runtime dependency is introduced. Mozilla reviewers can reproduce these changes
from the upstream archives and the patch script.

## Local loading

Model hosts must import `env` / `pipeline` from
`src/model-host/transformers.js`, which overrides the upstream CDN default **before
inference**. Both the `.mjs` loader and `.wasm` resolve inside `vendor/`, relative
to the extension module URL. `numThreads = 1` avoids SharedArrayBuffer/isolation
requirements; `proxy = false` avoids a proxy worker. Importing this module does not
load a model or initialize WASM. Future pipelines should select `device: 'wasm'`.
Hugging Face model downloads/cache behavior is unchanged; this task downloads no
models and adds no production manifests, permissions or network hosts.

## Repeat the browser smoke test

The test uses Transformers.js's embedded ONNX MatMul operator and checks
`[2, 3] × [4, 5] = 23`, plus the observed WASM fetch URL. It needs no model files.
Its self-only CSP blocks remote fetches/scripts. Extension schemes do not reliably
expose Resource Timing, so the test records fetch calls and restores fetch after
completion.

Until the production manifests/build exist (later tasks), create a temporary
fixture from the repository root:

```sh
fixture=$(mktemp -d /tmp/butu-vendor-manual.XXXXXX)
cp -R src vendor tests "$fixture/"
cat > "$fixture/manifest.json" <<'JSON'
{
  "manifest_version": 3,
  "name": "Butu vendor smoke test",
  "version": "0.0.1",
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self'"
  }
}
JSON
printf '%s\n' "$fixture"
```

### Chrome

1. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**,
   and select the printed fixture directory.
2. Copy its extension ID. Open
   `chrome-extension://<ID>/tests/vendor-smoke.html`.
3. Open DevTools → Network, disable cache, then reload. Expect
   `PASS: Transformers.js 3.8.1; ONNX matmul = 23` and an extension-local WASM URL.
4. Check that `transformers.js`, the `.jsep.mjs` loader and `.jsep.wasm` binary all
   use `chrome-extension://<ID>/vendor/`; no CDN or Hugging Face request should occur.
5. Remove the temporary extension afterwards.

### Firefox

1. In the temporary manifest, add this top-level property (with a separating comma):
   `"browser_specific_settings": {"gecko": {"id": "vendor-smoke@butu.test"}}`.
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on** → select
   the fixture's `manifest.json`.
3. Copy the **Internal UUID** shown for the extension and open
   `moz-extension://<UUID>/tests/vendor-smoke.html`.
4. Open DevTools → Network, disable cache, and reload. Expect the same PASS and
   `23`; the runtime, `.jsep.mjs` and `.jsep.wasm` must all load from
   `moz-extension://<UUID>/vendor/`, with no CDN/Hugging Face requests.
5. Remove the temporary add-on afterwards.

Automated verification on this machine used isolated temporary extension fixtures,
headless Chromium and Firefox 154.0.1. This verifies runtime vendoring/loading;
model generation, model memory and persistent model hosts remain later Phase 0 tasks.
