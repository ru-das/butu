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
