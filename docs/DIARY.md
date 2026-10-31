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
No model or network call is made by this page. It inherits static paper,
pastels and bundled handwriting fonts, with taped sheets and a stacked narrow
layout. No animation is used, including under reduced motion. Each sheet lists unique distracting hostnames under “Places you left me for”.
Missing or empty domain lists show “You stayed beside me.” URLs, paths and invalid
entries are omitted; domains are plain handwritten text, never clickable links.
The Settings link opens the bundled settings page described below.

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

## Task 4.4 manual checks — both browsers

Chrome: build and reload `dist/chrome` at `chrome://extensions`. Firefox: build
and reload `dist/firefox/manifest.json` at `about:debugging`. For each browser:

1. Open the diary in an isolated profile, run the fixture above with
   `domains: ['Reddit.com', 'reddit.com.', 'video.example.com', 'bad/path']`.
2. Confirm each sheet has “Places you left me for” with `reddit.com` and
   `video.example.com` once each, in handwriting, without links or paths.
3. Change the fixture to `domains: []`, then omit `domains`: both show
   “You stayed beside me.” Reload; the same result persists.
4. Repeat at 390px width and 200% zoom with a long hostname; no horizontal scroll.
5. Start a real session with a blocklisted domain, spend foreground time there,
   stop the session and confirm that domain appears on the new sheet.

## Settings (task 4.5)

The diary’s Settings link opens `src/diary/settings.html`, with a back link.
Allowlist and blocklist accept one bare hostname per line. Saves trim whitespace,
normalize case/trailing dots and remove duplicates; URLs, paths, wildcard prefixes
and credentials fail validation without changing storage. Existing classifier
semantics apply: parent domains include subdomains, allowlist wins conflicts,
and browser/extension pages stay excluded. Saved domain changes re-evaluate active
web tabs; they do not rewrite old diary pages.

Volume defaults to 25%, mute defaults off. Save settings persists all four keys
(`allowlist`, `blocklist`, `volume`, `muted`) in `storage.local`. Loading disables
controls; read/write failures show recovery copy. Voice tests use the **saved**
volume/mute state, not unsaved edits. At zero volume or while muted, the test
explains how to hear Butu without playing. Otherwise the background routes a
fixed bundled `butu-01.mp3` to the Firefox background audio host or Chrome offscreen
document. No model is loaded for this test, and no synthesis/API call occurs.
Repeated tests replace the previous preview; completion, decode/autoplay failure
and mute clean it up. Playback blocked by the browser stays silent.

The settings page credits ElevenLabs/elevenlabs.io and states noncommercial
Free-plan terms. Provenance and original usage records remain in the existing
voice/SFX manifests and docs/voice-design.md. No new assets, permissions,
dependencies, network hosts, API-key fields or runtime budget controls were added.
The same bundled paper/fonts and static responsive layout are reused.

### Exact settings checks — Chrome

1. Run `./build.sh`, reload `dist/chrome` at `chrome://extensions`, open Butu →
   Open our diary → Settings. In a fresh profile, confirm empty domain lists,
   25% volume, mute off, attribution and the back link.
2. Enter `Work.Example.` twice (one per line) in Always on task, and
   `play.example` in Always off task. Set volume to 37%, enable mute, click
   Save settings. Confirm “Your settings are saved.” and `work.example` once.
3. Click Test Butu’s voice. Confirm the quiet message and silence. Uncheck mute,
   Save settings, then test: listen for “Hello, little star. Shall we begin?”
   Repeat while the clip plays: the old test should stop. Set volume to zero,
   save and test again: silence and the quiet message.
4. Enter `https://play.example/path` in a list and save. Confirm inline browser
   validation and no stored change. Reload: the last valid lists, volume and mute
   persist. Remove both lists and save: empty lists persist after reload.
5. Set `example.com` in Always off task. Start a session and visit
   `https://example.com`; after the grace period verify haunting. In Settings,
   add `example.com` to Always on task and save; return to the page and verify
   it is on task. Remove it from Always on task and save; it is off task again.
   A parent entry must also apply to its subdomains; extension/internal pages
   must stay excluded. Stop the session afterward.
6. Navigate back and forward, use only the keyboard, narrow to 390 CSS pixels,
   zoom to 200%, and enable reduced motion. Controls and labels must remain
   readable and reachable without horizontal scroll. Disconnect the network:
   saved settings and bundled voice test still work.

### Exact settings checks — Firefox

1. Run `./build.sh`; reload `dist/firefox/manifest.json` at
   `about:debugging#/runtime/this-firefox`. Open Butu → Open our diary → Settings.
2. Repeat Chrome steps 1–6, including audible tests, reload persistence, domain
   precedence, keyboard/narrow/zoom checks and offline playback. Reload the
   temporary add-on rather than restarting Firefox.

Automated installed-extension coverage: `node tests/browser-diary.cjs` now also
checks settings navigation, defaults, canonical saves, invalid-input rejection,
persistence, muted/unmuted voice routing without a session, credits and layout.
Headless checks verify routing and cleanup; the listening steps above still
require a person. Evidence/screenshots remain under `.local-reports/diary/`.
