# Template possession text — task 3.7

Stage 2 now fills an authored taunt with the current task and each eligible
heading's original text. Stage 4 fills an authored line naming the task.
`src/lib/templates.js` limits task values to 200 characters and heading values
to 160, normalizes whitespace, and supplies defaults. Values stay literal,
including HTML-looking strings and `{heading}` inside the task.

`src/lib/possession.js` selects templates deterministically from the session
identity and page URL. The content script caches the current page's choices;
restores, extraction, form focus, reloads and revisits keep the same selection.
A new session selects afresh. SPA URL changes restore the old heading text
before applying the new page's choices. No growing URL cache or extra storage
is needed. Headings retain their original elements, text nodes and handlers;
all inserted text uses `textContent`.

The diary shell shows a stable authored caption for the current session,
using the same interpolation helper, and clears it when the session ends.
Saved session history and historical caption rendering remain tasks 4.1/4.3.
The exported `diaryCaption(session)` can render a saved session unchanged.

Each heading replacement, visible stage-4 line and rendered diary caption logs
`Butu text` with `{ source: 'template', kind: 'taunt' | 'stage4' | 'diary' }`.
Unchanged stage polls do not log again. These local console records contain no
page text, task text or URLs. There is no generation, retry or text-model load.
The three bundled copy modules are web-accessible for content-script imports;
no permissions, dependencies or network hosts were added.

## Verification — 2026-10-30

Structured results and actual displayed lines: [possession-checks.json](possession-checks.json).
The installed-extension run uses blocklist overrides and seeded accumulated
foreground totals of 16/46/91/181 seconds, followed by the real timing message
flow and a switch to an allowlisted work tab. It verifies stages and restoration,
not three minutes of wall-clock waiting per page or semantic detection accuracy.
The ten public pages are W3C's Cool URIs, Web history, Tim Berners-Lee and Style
Guide; CERN's WWW project, Summary, What is Hypertext and Policy; and IANA's
Example Domains and Reserved Domains. Displayed heading lines are counted once
at stage 2; each stage-4 central line is counted once, excluding redisplays.

Both Chrome 153.0.8010.12 and Firefox 154.0.1 restored exact markup and original
nodes on all ten pages. Each browser displayed **28 template lines and zero
model lines**. Actual strings were checked against the authored packs. Firefox's
last page needed a separate rerun after a delayed initial stage observation;
the report records that limitation. The DOM fixture passes **58 checks** in each
browser (Chrome also passes with reduced motion on/off); the installed diary
passes all five checks in each browser. All **31 node tests** and both builds pass.

## Exact manual checks — Chrome

1. Run `./build.sh`. Load/reload `dist/chrome` at `chrome://extensions` with
   Developer mode enabled. Reload existing web tabs.
2. Run `python3 -m http.server 8776 --bind 127.0.0.1` from the repository.
   Open `http://127.0.0.1:8776/tests/content-haunt.html`; wait for
   `PASS: 58 haunting checks`. Repeat in DevTools → More tools → Rendering
   with `prefers-reduced-motion: reduce` and `no-preference`.
3. In the extension service-worker console, record existing allow/blocklists,
   then run:

   ```js
   chrome.storage.local.set({
       allowlist: ['localhost'], blocklist: ['w3.org', 'info.cern.ch', 'iana.org']
   });
   ```

4. Open `http://localhost:8776/tests/content-timing.html` as the work tab.
   Open an off-task URL listed in `possession-checks.json`. In its page console
   before starting a session, run:

   ```js
   window.beforeButu = {
       html: document.documentElement.outerHTML,
       nodes: [document.documentElement, ...document.querySelectorAll('*')]
   };
   ```

5. Start a session with task `Study database systems`. Keep the off-task tab
   visible and its window focused. At 45 seconds, up to two safe headings show
   authored taunts; at 180 seconds, the central line names the task.
   In the page console, filter for `Butu text`: each displayed line reports
   `source: 'template'`. Subsequent timing ticks must not add duplicate logs.
6. Switch to the work tab: the headings restore immediately and the overlay
   fades within 3 seconds. Stay there for 60 foreground seconds to reset the
   accumulated off-task time. Return and assert within the 15-second grace period:

   ```js
   console.assert(document.documentElement.outerHTML === beforeButu.html);
   console.assert(beforeButu.nodes.every((node, index) =>
       [document.documentElement, ...document.querySelectorAll('*')][index] === node));
   ```

   Let haunting resume: the same page uses the same template. Focus an input
   during haunting: all effects disappear, and its draft and selection survive.
   Stop the session; all headings and overlays restore. Repeat steps 4–6 for
   each of the ten URLs, stopping between pages for a fresh baseline.
7. During a session, open the diary directly from the extension worker console:

   ```js
   chrome.tabs.create({ url: chrome.runtime.getURL('src/diary/diary.html') });
   ```

   A caption appears below the title. Reload the diary: the caption stays the
   same. Stop the session: it clears. Start another session with an HTML-looking
   task such as `Study <b>databases</b>`: any interpolated markup stays literal
   in the diary and stage-4 line. Restore the previous domain lists afterward.

## Exact manual checks — Firefox

1. Run `./build.sh`. At `about:debugging` → This Firefox, load/reload
   `dist/firefox/manifest.json` as a Temporary Add-on. Reload existing web tabs.
2. Start the same local server and open the fixture from Chrome step 2;
   confirm `PASS: 58 haunting checks`. To check reduced motion, record the
   existing `ui.prefersReducedMotion` value in `about:config`, test Number
   values **1** and **0** with a fixture reload each time, then restore it.
3. Use Inspect on Butu to open the extension background console. Perform
   Chrome steps 3–7 unchanged in Firefox: the same APIs set overrides and open
   the diary. Verify all ten pages, template-source logs, stable revisits,
   exact restoration, form protection and diary clearing.
4. Butu's font and drawings must load from `moz-extension://` (Chrome uses
   `chrome-extension://`); no text-model requests should appear. Restore the
   previous domain lists and reduced-motion preference.
