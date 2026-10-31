# Firefox submission fixes

The Firefox manifest declares `data_collection_permissions.required: ["none"]`.
Task text, page content, browsing history, settings and diary data stay local.
Only the pinned Hugging Face model files are downloaded on first use.

The build selects `src/model-host/client-firefox.js` as the packaged `client.js`
and omits the Chrome client and offscreen page. Chrome selects its own client.
The Firefox background page still owns its embedding worker and bundled audio.

Two documented CSP patches remove the legacy Function constructor fallback and
restrict ONNX module loading to a literal bundled loader. See vendor/README.md
for upstream versions, download links and reproduction using
`python3 scripts/patch-vendor.py`. WASM and licences are unchanged. The extension
does not enable JavaScript `unsafe-eval` or download executable JavaScript.

Mozilla reference: https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/

## Verification (2026-10-31)

- Mozilla addons-linter: 0 errors, 0 warnings, 0 notices.
- 52 unit tests pass, including browser-specific packaging, host lifecycle,
  absence of Function constructors, and rejection of substituted loader URLs.
- Installed extensions in isolated Chrome and Firefox profiles: bundled WASM
  MatMul returns 23 in both browsers; real background-host embedding comparisons
  return 0.8031071906737447 in both; bundled voice dispatch and host release pass.
- Vendor checksums pass; the patch script is idempotent.

Browser check evidence is local under
`.local-reports/firefox-submission/run-1793427454985/`.

## Manual checks

Firefox:
1. Upload the updated unsigned ZIP to Mozilla; expect no validation errors or warnings.
2. Locally, open `about:debugging` → This Firefox → Load Temporary Add-on and
   select `dist/firefox/manifest.json` after running `./build.sh`.
3. Reload a regular web page. Start a session for “database normalization”.
   Let the first-use model download finish and confirm detection starts.
4. Open the diary settings and test Butu's voice with mute off and volume above zero.
5. Stop the session; confirm the page restores and the audio stops.

Chrome:
1. Open `chrome://extensions`, enable Developer mode, and load `dist/chrome/`
   unpacked (or reload the existing extension) after running `./build.sh`.
2. Reload a regular web page. Start the same session, wait for the first-use
   download, and confirm detection starts.
3. Test Butu's bundled voice from diary settings, then stop the session.
4. Confirm the page restores, audio stops, and no model-host error appears in
   the extension service worker console.
