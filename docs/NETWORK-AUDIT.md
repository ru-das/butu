# Runtime network audit (tasks 4.9 / decision 23)

Run `./build.sh`, then `node tests/browser-audit.cjs chrome` and
`node tests/browser-audit.cjs firefox`, **sequentially**. These require installed
Chrome/Chromium and Firefox, Node 22, local listening sockets and first-download
network access. No package install or API key is needed. Override browser binaries
with `BUTU_CHROME` / `BUTU_FIREFOX`; `BUTU_AUDIT_RESULTS` selects the evidence folder.
The runner creates fresh profiles and diagnostic distribution copies under
`.local-reports/audit/`; it never opens the user's profile. Only a native audio-event
probe is added to those copies. Model, thresholds, stage times and playback code
remain unchanged. Network capture uses browser protocols, not a mocked fetch.

## Steps executed in each browser

1. Install the freshly built extension and open the actual popup document.
   Chrome captures native Network events across pages, the service worker,
   offscreen document and dedicated worker, attaching before execution.
   Firefox uses a parent-process HTTP-channel observer, including redirects and
   the triggering principal. Both include the extension's worker traffic.
2. Intentionally try fixed ElevenLabs and example.com URLs from the popup.
   Require two `connect-src` CSP violations. These are separate negative controls,
   not normal-session requests; CSP blocks dispatch. This caught the stale
   ElevenLabs CSP allowance, which has been removed from **both** manifests.
   The build regression now checks the bundled-only policy.
3. Start via the popup form, visit a local database article with no domain
   overrides and wait for the real MiniLM-L3 q8 semantic verdict. Require visible
   first-download progress and actual Hugging Face requests (a monitor that sees
   nothing cannot pass). Inspect every remote request's method, body and origin.
4. Stop and check the saved summary. Enable a native HTTPS block: Chrome's
   `Network.setBlockedURLs` on current and future targets; Firefox's observer
   cancels HTTPS channels before dispatch. A fixed Hugging Face probe must both
   fail and appear in the native capture, proving the offline guard works.
5. Start a new session, navigate to a fresh URL and require cached model inference
   to finish with external connectivity blocked. The local HTTP fixture remains
   reachable so page navigation is distinct from extension network traffic.
6. Open the diary **through the popup link**; read both saved sessions, decode its
   bundled fonts/images, open settings and run the bundled voice preview.
7. With HTTPS still blocked, visit a blocklisted fixture and exercise stages
   1–4. This network/asset pass seeds existing timing storage to avoid waiting
   three minutes; the Definition-of-done run separately uses the real clock.
   Require native `playing` events for all four music tracks and all three
   scheduled custom Butu whispers (stage 1 has music only, per F4).
8. Return to an allowlisted work page. Compare the entire original document HTML
   and the original heading/text node identities after the return fade. Stop and
   confirm the on-task page stayed untouched.
9. Reject any external HTTP attempt in the offline phase, and any remote font,
   image or media request. Preserve raw requests and per-check results locally;
   the tracked summary strips transient signed-download query values.

## Attribution and scope

The only allowed extension remote transfers are GETs for the pinned
`Xenova/paraphrase-MiniLM-L3-v2` tokenizer, tokenizer configuration, model
configuration and quantized ONNX weights. Hugging Face redirects JSON files to
`huggingface.co/api/resolve-cache/...` and weights to its `*.hf.co` CDN. Signed
CDN parameters describe public file delivery, not task/page input. No request body
is submitted. There are no ElevenLabs calls, task/page/URL uploads, analytics,
external fonts, images or audio. Local extension/Blob/WASM resources are not
remote transfers. Tests use synthetic task/page data and keep their logs local.

Firefox also makes its own security/remote-settings requests, attributed to
`[System Principal]`; these remain in raw captures but are excluded from the
extension verdict. Normal websites' own navigation/resources are also outside
Butu's privacy promise; the local fixtures remove that ambiguity. Chrome's
`--disable-background-networking` reduces browser housekeeping. The audit does
not claim the browser or visited sites have no network activity.

These checks establish the exercised paths on the recorded browser versions,
not all possible future code paths. Static review also checked runtime source
for fetch/XHR/WebSocket/beacon use and remote CSS/image/font URLs: model loading
is the only runtime HTTP caller; voice/media paths use `chrome.runtime.getURL`.
`docs/network-audit-checks.json` records the completed runs.

## Exact manual reproduction: Chrome

1. Build, open `chrome://extensions`, enable Developer mode and Load unpacked
   `dist/chrome` in a fresh test profile.
2. Inspect the service worker, offscreen document and its embedding worker;
   enable Preserve log in each Network view. Do not disable the model Cache API.
3. On a normal article, start a session without domain overrides. Observe only
   the pinned Hugging Face file GETs/redirects from extension contexts; inspect
   query/body fields and initiators. Webpage-origin requests belong to the site.
4. Stop, then use DevTools network request blocking for `https://*` in the host
   and worker (including newly created contexts), or disconnect external network.
   Start another session on a different article URL: inference must still work.
5. In diary settings, play the voice test. On an off-task page wait 15/45/90/180
   foreground seconds; confirm bundled music, whispers and doodles work. Return
   to work, then stop: restore the page and end playback. Open the diary again.
6. Confirm no remote fonts/images/media or ElevenLabs requests in the preserved
   extension logs. Keep intentional CSP probes separate if repeating the runner.

## Exact manual reproduction: Firefox

1. Build, open `about:debugging` → This Firefox → Load Temporary Add-on →
   `dist/firefox/manifest.json` in a fresh test profile.
2. Inspect the extension background and its embedding worker. Enable persistent
   Network logs and include worker requests, or use the parent-channel runner
   above so worker transfers cannot be missed.
3. Start on an ordinary article without overrides. Check the same pinned model
   file GETs and HF redirects, no request body, and local font/image/audio URLs.
4. Stop, disconnect external connectivity (keep any local fixture server running),
   start again on a new URL, and require a real cached semantic verdict.
5. Test voice in diary settings, then walk an off-task page through all four
   real stage times. Return to work and stop; verify restoration, silence and diary.
6. Confirm zero extension remote transfers after caching. Separate Mozilla's
   system-principal security/update traffic and normal site resources from Butu.
