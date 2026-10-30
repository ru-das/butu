# On-task verdicts (task 2.3)

The background evaluates tabs on activation, URL changes (including SPA routes),
completed loads and session start. Only HTTP(S) pages in a live session qualify;
internal, extension and new-tab schemes are rejected before reading text,
looking up cached scores or creating the model host. Subframes are not sampled.

`chrome.storage.local` holds top-level `allowlist` and `blocklist` arrays of domain
names, initially absent/empty. Matching is case-insensitive, includes subdomains,
and checks a dot boundary (example.com does not match notexample.com). Allowlist
wins if both match. The settings UI remains task 4.5. Overrides produce boolean
verdicts without extraction or model loading; their score is `null` because no
similarity was measured. Rules are checked on each evaluation and again after
inference so changed settings override any stored score.

For other pages, the existing extractor supplies title, description and main text
plus the URL at extraction time. Their combined, normalized embedding input is
bounded by `EMBEDDING_LIMITS.pageChars`. The existing lazy MiniLM-L3 worker compares
it with the session task: Firefox hosts it in the background page; Chrome creates
or reuses one offscreen document with the WORKERS reason. No permission, host,
dependency or runtime generative model was added. Worker idle release is unchanged;
explicit session-end model/audio cleanup remains task 4.6.

`verdictCache` in local storage contains `{ sessionKey, entries: [{ url, score }] }`.
It survives background suspension and holds at most `EMBEDDING_LIMITS.cacheEntries`
URLs, evicting the oldest inserted scores. URLs include query and fragment, so
individual YouTube videos remain distinct. Revisited URLs reuse the session's
score even if their content changed; this is intentionally a per-URL session
cache. Overrides need no cached model score. Start/stop/expiry clear the cache;
a different session identity cannot reuse it. Page text is never persisted.
Pending comparisons are bounded and duplicate session/URL jobs coalesce. Results
are discarded if the session ends/changes or the tab navigates during inference.
A new navigation/activation retries unavailable extraction/model work; errors do
not become off-task verdicts or enter the cache.

Each completed evaluation logs `[Butu verdict]` with `url`, `onTask`, `score`,
`source` and `cached` in the background console. Errors log `source: 'unavailable'`
and null verdict/score; excluded pages produce no verdict log. These logs stay
local. `ON_TASK_THRESHOLD` remains `null` as agreed for task 2.4: embeddings log
real scores with `onTask: null, source: 'threshold-unset'`. Once tuned, scores at
or above the configured threshold yield true; lower scores yield false.

## Automated checks

`node --test tests/*.test.js` covers exclusion schemes, domain boundaries and
precedence, bounded input, malformed scores, inclusive threshold comparison,
untuned behavior, real background routing with mocked browser/model APIs,
cache reuse across background wakes, rule changes, navigation during inference,
and session stop during inference. `./build.sh` produces both browser packages.
These tests do not replace the installed-extension checks below or task 2.4's
real-page threshold measurements.

## Manual Chrome steps

1. Run `./build.sh`. In `chrome://extensions`, load unpacked `dist/chrome`
   or reload Butu. Open its service-worker console. Keep it open for verdict logs.
2. In that extension console, run:
   ```js
   chrome.storage.local.set({ allowlist: ['example.com'], blocklist: ['example.org'] });
   ```
   Start a session from the popup with task `Study database normalization`.
3. Visit `https://example.com/`, then `https://example.org/`. Expect allowlist/true
   then blocklist/false logs, both with null score. These visits alone must not
   create an offscreen model document or download a model.
4. Visit `https://en.wikipedia.org/wiki/Database_normalization`. Allow the initial
   Hugging Face download to finish. Expect a finite score and `threshold-unset`.
   Open the extension's offscreen inspector to check for worker errors if needed.
5. Switch away and back. Expect the identical score with `cached: true`. Navigate
   to a different article; expect a new URL/score. Same-document URL changes
   should also trigger evaluation. Internal page content changes at the same URL
   intentionally reuse the cached score.
6. Close DevTools, use the service worker's Stop control if available, then switch
   away/back to wake it. Reopen the console and revisit the article; expect a
   cached score. Inspect `chrome.storage.local.get('verdictCache', console.log)`.
7. Stop the session, then start a new task. Revisit the article; expect
   `cached: false`. Stop during a fresh page's initial inference and verify that
   no late verdict repopulates `verdictCache`.
8. Open `chrome://settings`, a new tab, and Butu's diary (open
   `chrome.runtime.getURL('src/diary/diary.html')` in a tab). Expect no verdict logs
   for those URLs and no extraction. End the session and remove test rules:
   `chrome.storage.local.remove(['allowlist', 'blocklist'])`.

## Manual Firefox steps

1. Run `./build.sh`. In `about:debugging#/runtime/this-firefox`, load temporary
   add-on `dist/firefox/manifest.json` or reload Butu. Click Inspect for its console.
   Grant website access if Firefox prompts for host permissions.
2. Run the same storage snippet from Chrome step 2, then start the same task.
3. Repeat Chrome steps 3–5. Expect identical policy/cache behavior; the embedding
   worker runs under the background page, with no Chrome offscreen API involved.
4. Close the inspector, switch tabs and leave Butu idle long enough for its event
   page to unload. Revisit the article, reopen Inspect and switch away/back.
   Expect a cached score from local storage; inspect `verdictCache` as above.
5. Repeat the stop/new-session and stop-during-inference checks from Chrome step 7.
6. Open `about:preferences`, `about:newtab` and Butu's diary. Expect no verdicts or
   extraction for them. End the session and remove the test rules as in Chrome
   step 8. No page content or URLs should appear in network request payloads.
