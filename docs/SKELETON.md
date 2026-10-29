# Task 1.1: extension skeleton

Run `./build.sh` from any directory to copy `src/`, `vendor/`, and `assets/`
into `dist/chrome/` and `dist/firefox/`, each with its browser's manifest.
Each build replaces those generated directories, removing stale files.
The shared background entry point is intentionally inert; no models load,
network requests run, or pages change. Popup and session logic are later tasks.

## Permissions

Both manifests request:

- `storage`: keep sessions, settings, diary entries, and the ElevenLabs key locally.
- `alarms`: end sessions on time even when the popup is closed or the background restarts.
- `http://*/*`: access ordinary HTTP page URLs and content for local detection and reversible effects.
- `https://*/*`: access ordinary HTTPS pages and permit the specified model downloads and opt-in TTS.

Chrome additionally requests:

- `offscreen`: host the embedding worker and audio in a document outside the service worker.

Host access covers tab URLs and titles, so no separate `tabs` permission is needed
([Chrome permissions reference](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)).
No `activeTab`, `scripting`, `webRequest`, history, notification, or unlimited-storage
permission is requested. Content-script declarations will accompany their implementation.
HTTP/HTTPS patterns exclude file URLs and browser/extension schemes.

The extension-page CSP permits connections only to its own origin,
`https://huggingface.co`, `https://*.hf.co` (model download redirects), and
`https://api.elevenlabs.io`. The latter is reserved for opt-in session-start TTS.
Scripts, workers, fonts, images and other assets remain bundled; WebAssembly
compilation is permitted for ONNX Runtime. Local blob audio supports TTS playback.
Firefox uses a module background script in the browser-generated background page
([MDN background reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)).

## Verification

On 2026-10-29, both built extensions loaded in isolated headless browser profiles:
Chrome started `src/background.js` without exceptions; Firefox 154.0.1 reported
Butu active with no matching add-on errors or warnings. All 11 unit tests passed,
including build copying, invocation from another directory, and stale-file removal.
Shell syntax, whitespace, and `.env`/`dist/` ignore checks passed.

Manual Chrome check:

1. Run `./build.sh`.
2. Open `chrome://extensions`, enable Developer mode, click Load unpacked,
   and select this repository's `dist/chrome/` directory.
3. Confirm Butu appears enabled with no Errors button or manifest warning.
4. Click its service worker inspection link; confirm the console has no startup errors.
5. Reload Butu from the extensions page and confirm it still loads without errors.

Manual Firefox check:

1. Run `./build.sh`.
2. Open `about:debugging#/runtime/this-firefox`, click Load Temporary Add-on,
   and select this repository's `dist/firefox/manifest.json`.
3. Confirm Butu appears without manifest warnings or errors.
4. Click Inspect; confirm the console has no startup errors.
5. Click Reload on the debugging page and confirm it still loads without errors.

Neither browser has a popup or session controls at this skeleton stage.
