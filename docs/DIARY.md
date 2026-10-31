# Scrapbook diary (task 4.3)

Open “Open our diary” in the popup. Each ended session has a paper sheet with
local date/time, literal task text, elapsed minutes:seconds, wander count, the
saved authored caption and a bundled Butu drawing. Most recently saved sessions
appear first; storage remains oldest-first. New sessions appear without reloading.
The current-session caption stays separate from saved pages. An empty diary
explains how to make the first page; read failures ask the user to reload.

Drawing quality is cumulative off-task time / actual elapsed session time:
below 10% uses `butu-calm.svg`, 10% through 30% uses `butu-waiting.svg`, and
above 30% uses `butu-wrong.svg`. Zero elapsed time uses happy Butu. Cutoffs are
in `src/config.js` (decision 24). These drawings do not claim that every remaining
second was productive work; elapsed time includes breaks and unknown intervals.

The diary reads only local storage, tolerates missing history, skips incomplete
entries and renders at most 50 saved pages. Task/caption strings use `textContent`.
No model, audio or network call is made by this page. It inherits static paper,
pastels and bundled handwriting fonts, with taped sheets and a stacked narrow
layout. No animation is used, including under reduced motion. Domains and
settings remain tasks 4.4 and 4.5.

All imagery is reused from the original CC0 set in
[doodle credits](../assets/doodles/README.md); typography retains its bundled
licences in [font credits](../assets/fonts/README.md). No new assets are added.

## Exact manual checks — Chrome

1. Run `./build.sh`. Use an isolated Chrome profile, load `dist/chrome` at
   `chrome://extensions`, then open Butu → “Open our diary”. Check the title,
   paper, handwriting, empty-page guidance and extension-local URL.
2. In the diary tab’s DevTools console, run the fixture below. Confirm three
   sheets appear immediately: wrong, uneasy, happy, with date/time, literal
   task markup, `10:00`, wander counts 2/1/0 and the saved caption.
3. Reload the diary and extension, then reopen from the popup. The same pages
   persist. Disconnect the network and reload: fonts, paper and all drawings
   still render. Network must show only local extension resources for the diary.
4. Narrow the tab to 390 CSS pixels and zoom to 200%. Scroll all three sheets:
   task/caption text wraps, images remain inside sheets, and no horizontal
   scrolling is needed. Emulate reduced motion: the same static layout remains.
5. Clear the fixture with `await chrome.storage.local.remove('sessionHistory')`.
   Confirm the empty page returns immediately. Start and stop a real session
   from the toolbar while the diary stays open: one new page must appear.

Fixture (isolated profile only; replaces diary history):

```js
const now = Date.now();
await chrome.storage.local.set({
  sessionHistory: [0, 180, 181].map((offTaskSeconds, i) => ({
    task: '<b>Study DBMS</b>',
    startedAt: now - 600000 - i * 86400000,
    endsAt: now - i * 86400000,
    endedAt: now - i * 86400000,
    elapsedSeconds: 600,
    completed: true,
    offTaskSeconds,
    timesWandered: i,
    domains: [],
    caption: 'I kept this little page for us.',
  })),
});
```

## Exact manual checks — Firefox

1. Run `./build.sh`. In an isolated Firefox profile, open
   `about:debugging#/runtime/this-firefox` → Load Temporary Add-on →
   `dist/firefox/manifest.json`. Open Butu → “Open our diary”. Verify the same
   empty state and a `moz-extension://…/src/diary/diary.html` URL.
2. Run the same fixture in the diary tab’s Web Console. Repeat Chrome steps
   2–5, including reload, offline assets, narrow width, 200% zoom, reduced motion,
   live empty state and a real start/stop. Reload the temporary add-on rather
   than restarting Firefox, which removes temporary extensions.

## Automated checks

`node --test tests/*.test.js` covers exact 10%/30% boundaries, fractional
seconds, an instant stop, malformed records, retention and history immutability.
`./build.sh` builds both browsers. `node tests/browser-diary.cjs` launches isolated
Chrome and Firefox profiles, seeds synthetic local sessions, checks live updates,
literal markup, all three drawings, reload persistence, local fonts/images,
50 long entries, narrow layout and clearing history. No model download is needed.
Set `BUTU_CHROME` / `BUTU_FIREFOX` for other binaries. Evidence and full-page
screenshots go under ignored `.local-reports/diary/`; checked-in results are in
[diary-checks.json](diary-checks.json).
