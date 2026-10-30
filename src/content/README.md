# Page text extraction (task 2.1)

Both manifests inject `content.js` at document idle into top-level HTTP(S) pages
only. Browser internal pages, new tabs and extension pages do not match.
No page text is read until an extension caller sends `{ type: 'page:extract' }`
with `chrome.tabs.sendMessage(tabId, message)`. The response is
`{ title, description, mainText, url }`, with whitespace collapsed in text fields.
The URL lets the verdict caller discard extraction from a different navigation. A module-loading
or extraction failure returns `{ error: 'Page text is unavailable.' }`.

The sample prefers a nonempty `main` / `[role="main"]`, then `article`, then
`body`. It stops at `PAGE_MAIN_TEXT_CHARS` from `src/config.js` (500 characters).
It excludes navigation, footers (including ARIA roles), hidden subtrees,
nonrendered text, scripts/styles/templates, closed-details content and editable
fields. Visible descendants that override `visibility:hidden` remain eligible.
Visible text below the fold is eligible; visibility does not mean viewport-only.
Inline words and punctuation are preserved and block text is separated.

This is a semantic-landmark heuristic, not site-specific readability scoring.
The first nonempty matching landmark supplies the sample. Iframes, shadow DOM,
canvas text and generated CSS content are not traversed. SPA updates are picked
up on the next request; there is no page observer or automatic polling.

The classic entry point imports bundled ES modules lazily. Only the extractor,
its normalization helper and config are declared web-accessible so Chrome can
load those modules. No dependency, permission or remote host was added.
Extraction does not modify the DOM, store results, or make network requests.
The background requests extraction during active sessions; see
[verdict routing and manual checks](../../docs/VERDICTS.md).

## Verification

- `node --test tests/*.test.js`: unit and manifest/build regressions.
- `./build.sh`: creates both extensions with the same content scripts.
- Serve the repository with `python3 -m http.server 8769 --bind 127.0.0.1`.
  Open `http://127.0.0.1:8769/tests/content-extraction.html` in each browser.
  Wait for `PASS: 22 extraction checks`. This exercises actual DOM layout,
  landmark/fallback choice, visibility, editable exclusions, inline boundaries,
  the character limit, missing metadata, DOM preservation, repeated extraction
  after changes, and the classic-script message handler with a mocked runtime.

## Manual Chrome checks

1. Build, then open `chrome://extensions`, enable Developer mode, and load
   unpacked `dist/chrome` (or reload the existing Butu extension).
2. Start the local fixture server above. Open the fixture URL in a new tab;
   wait for `PASS: 22 extraction checks`.
3. On Butu's extension card, inspect the service worker. In its console run:

   ```js
   chrome.tabs.query({ url: 'http://127.0.0.1:8769/tests/content-extraction.html' }, (tabs) => {
       chrome.tabs.sendMessage(tabs[0].id, { type: 'page:extract' }, console.log);
   });
   ```

4. Confirm `{ title: 'Butu extraction checks', description: '', mainText:
   'PASS: 22 extraction checks' }`. This separately checks the installed content
   script and extension-origin module imports. Check for no extension errors.
5. In the fixture tab's page console, run `document.querySelector('#result').textContent
   = 'Changed page text'`. Repeat step 3 and confirm `mainText` changes.
6. Open the popup and confirm the session form still works. Opening the diary
   or a new tab must not run a content script (check the DevTools Sources panel).

## Manual Firefox checks

1. Build, then open `about:debugging#/runtime/this-firefox`, choose Load Temporary
   Add-on, and select `dist/firefox/manifest.json` (or reload Butu).
2. Start the same local server. Open the fixture URL in a new tab; wait for
   `PASS: 22 extraction checks`.
3. In `about:debugging`, click Inspect for Butu. Run the same `chrome.tabs.query`
   snippet from the Chrome steps in the extension console.
4. Confirm the same title, empty description and passing-checks main text, with
   no extension errors. Edit the fixture's result text in its page console as
   in Chrome step 5; repeat the request and confirm the fresh text.
5. Open the popup and diary and confirm they still load. The debugger must show
   no content-script execution on extension pages, `about:` pages or new tabs.

# Reversible haunting (task 3.4)

`timing:activity` now returns `{ url, stage }`, calculated by the background from
its existing per-tab totals. The content script rejects invalid stages, stale
replies and replies for another URL. Storage timing updates restore all haunted
tabs as soon as the active tab is on task; the 60-second reset still controls
whether a later off-task visit resumes its accumulated stage.

- Stage 1: five small margin doodles, including Waiting Butu.
- Stage 2: up to `STAGE_2_MAX_HEADINGS` eligible headings get placeholder text
  and the bundled handwriting font; Butu becomes Lonely.
- Stage 3: corrupted doodles, Wrong Butu, paragraph-area scribbles and a
  desaturating overlay.
- Stage 4: tiled frantic scribbles, Abandoned Butu and a central placeholder line.

Task/heading template personalization remains task 3.7. These drawings are static;
return uses only an opacity fade. No audio is played by content scripts.

Rewrites save each original **text node** and its value plus the heading's exact
previous marker attribute. No original element is replaced or cloned. Links,
listeners, inline styles, child identity, form values and selection survive.
Return restores heading content immediately, fades the pointer-transparent
viewport overlay for `RETURN_FADE_MS`, then removes it. Session stop, navigation
and form focus restore immediately. Inputs, textareas, form headings, editable
subtrees and focused form pages are excluded. Focus inside custom-element hosts
or iframes is treated conservatively. Extraction first restores the page so
Butu's text cannot influence relevance detection.

The font is temporarily registered with `FontFace` and removed on restore.
Manifest-injected CSS resolves relative asset URLs against the *site*, so the
content script supplies explicit `chrome.runtime.getURL()` values for every
bundled drawing/font. Both manifests expose only these additional bundled
assets; permissions and network hosts are unchanged. Credits remain in
`assets/doodles/README.md` (CC0) and `assets/fonts/README.md` (OFL).

## Automated DOM check — both browsers

1. Run `python3 -m http.server 8776 --bind 127.0.0.1` from the repository.
2. In Chrome, open `http://127.0.0.1:8776/tests/content-haunt.html` in a profile
   without an active Butu session. Wait for `PASS: 32 haunting checks`.
3. Repeat that URL in Firefox and expect the same result.

This fixture exercises actual DOM/CSS and all four stages using mocked extension
messages. It checks exact restoration, element/text-node identity, the original
link listener, a pre-existing marker, unsaved input value and selection, form and
editor exclusion, return fade completion despite repeated work updates, font
cleanup, stop, stale replies and extraction of the original page.

## Installed-extension manual check — Chrome

1. Run `./build.sh`. At `chrome://extensions`, enable Developer mode and load
   unpacked `dist/chrome`, or reload Butu. Reload existing web tabs too.
2. Inspect Butu's service worker. Set deterministic overrides in its console:

   ```js
   chrome.storage.local.set({
       blocklist: ['w3.org', 'info.cern.ch', 'iana.org'], allowlist: ['localhost']
   });
   ```

   Record any existing lists first and restore them after the test.
3. Open `http://localhost:8776/tests/content-timing.html` as the work tab.
   Open each of the following off-task sites in separate tabs:
   - `https://www.w3.org/Provider/Style/URI`
   - `https://info.cern.ch/hypertext/WWW/TheProject.html`
   - `https://www.iana.org/help/example-domains`
4. Before starting a session, run this in each site's page console:

   ```js
   window.beforeButu = {
       html: document.documentElement.outerHTML,
       nodes: [document.documentElement, ...document.querySelectorAll('*')]
   };
   ```

5. Start a 10-minute session in Butu's popup. Keep the first off-task page
   visible and its browser window focused. Observe stage 1 at 15 seconds,
   stage 2 at 45, stage 3 at 90, and stage 4 at 180. Confirm the bear variants,
   handwriting, increasingly tangled scribbles and central placeholder line.
   Links and scrolling must still work. In Network, all Butu drawings and the
   font must load from `chrome-extension://`, never the site's host.
6. Switch to the work tab. Wait at least 3 seconds for the fade, then remain
   there for 60 foreground seconds to reset accumulated off-task totals.
   Return to the tested page and immediately run:

   ```js
   console.assert(document.documentElement.outerHTML === beforeButu.html);
   console.assert(beforeButu.nodes.every((node, i) =>
       [document.documentElement, ...document.querySelectorAll('*')][i] === node));
   console.assert(!document.querySelector('[data-butu-haunt-root]'));
   ```

   All assertions must pass, before the new 15-second grace period expires.
7. Repeat steps 5–6 independently for the other two sites. On a page with a
   form, type an unsaved draft and focus the field during a stage: effects must
   disappear immediately, and the draft must survive. Stop the session and
   confirm every affected tab restores. Restore previous domain lists.

## Installed-extension manual check — Firefox

1. Run `./build.sh`. At `about:debugging` → This Firefox → Load Temporary Add-on,
   select `dist/firefox/manifest.json`, or reload Butu. Reload existing web tabs.
2. Click Inspect on Butu to open its background console. Use the same override
   snippet, fixture server, work tab, three sites and baseline snapshot from
   Chrome steps 2–4.
3. Repeat Chrome steps 5–7 in Firefox: keep each off-task tab visible/focused
   through 15/45/90/180 seconds, switch to work for the fade and 60-second reset,
   and assert identical markup/node identity when returning within grace.
4. Network must show Butu assets from `moz-extension://`. Confirm form focus,
   unsaved drafts, session-stop cleanup and restored domain settings too.

## Task 3.4 verification recorded — 2026-10-30

Installed headless Chrome **153.0.8010.12** and Firefox **154.0.1** passed:

| Site | Stages exercised | Rewritten headings | Return to work |
| --- | --- | --- | --- |
| W3C, Cool URIs | 1 → 2 → 3 → 4 | 2 | Exact HTML and original nodes restored |
| CERN, World Wide Web project | 1 → 2 → 3 → 4 | 1 | Exact HTML and original nodes restored |
| IANA, Example Domains | 1 → 2 → 3 → 4 | 2 | Exact HTML and original nodes restored |

The harness used domain overrides and seeded persisted totals at 16/46/91/181
seconds, then exercised the real installed `timing:poll` → `timing:activity`
message flow. It switched to an actual allowlisted work tab and inspected the
hidden off-task page after the fade. It did **not** wait 180 real seconds per
site; foreground timing itself was verified separately in task 3.2. Each stage
also passed extension-scheme drawing URLs, loaded handwriting font, correct
bear variant and expected scribble/central-line visibility checks. Stage-4
screenshots were inspected in both browsers. Structured results are retained
in [docs/haunt-checks.json](../../docs/haunt-checks.json).

The standalone DOM fixture passed **32 checks in each browser**. Build and
all **29 node tests** passed. The Impeccable mechanical detector reported no
findings. Template personalization and dedicated reduced-motion variants
remain the later plan tasks; the current drawings have no spatial animation.
