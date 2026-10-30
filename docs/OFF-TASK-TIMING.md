# Off-task timing — task 3.2

The content script reports visibility on load, visibility/focus changes,
pagehide/pageshow (including the back-forward cache), and once per second while
a session is running and the page is visible. Background routing checks the
sender, top frame, current URL, active tab and `chrome.windows.get().focused`.
Document focus alone is insufficient: focusing the address bar must not pause
time while the page remains visible in the focused window.

`chrome.storage.local.offTaskTiming` holds the session key, per-tab
`seconds`/URL/verdict/window, the active tab, last timestamp and on-task seconds.
Elapsed time is calculated from timestamps, not the number of interval callbacks.
Unknown verdicts and excluded pages do not count. Tab switches, minimization,
window focus loss and navigation pause the previous interval. Navigation keeps
the tab's accumulated seconds; closing a tab discards its entry. Background
wakes preserve timing; browser startup/extension installation clears the active
interval without charging downtime. Stopping or expiring a session clears timing;
a new session starts fresh.

The reset is shared across tabs. Only foreground on-task time advances the
60-second reset clock, including time across different on-task pages. Inactivity
pauses it; a foreground off-task visit breaks the streak. At 60 seconds every
tab's off-task total becomes zero. Stage visuals/audio remain future tasks.

## Automated checks

- `node --test tests/*.test.js`: pure timing boundaries, independent tabs,
  navigation, shared reset, focus gating, sender validation, background wake,
  browser startup, close and session lifecycle, plus existing regressions.
- Serve the repo with `python3 -m http.server 8771 --bind 127.0.0.1`; open
  `http://127.0.0.1:8771/tests/content-timing.html` in Chrome and Firefox.
  Both must show `PASS: 15 content timing checks`. This runs the actual content
  entry point with mocked extension APIs, visibility and clock; it checks report
  delivery and interval cleanup, not the browser's operating-system focus events.
- `./build.sh` builds both browser distributions.

Verified on 2026-10-30: all 29 Node tests pass; headless Chrome and Firefox each
pass the 15 content timing checks and the existing 22 extraction checks.
Installed-extension checks also ran in headed Chrome and Firefox on isolated
desktops, using real operating-system focus, minimization and keyboard input.
Measurements and test-environment details: [TIMING-CHECKS.md](TIMING-CHECKS.md).

## Manual installed-extension checks — Chrome

1. Run `./build.sh`. Open `chrome://extensions`, enable Developer mode, load
   unpacked `dist/chrome/` (or reload the existing extension), and refresh test
   web tabs. Click Butu's **service worker** link to open its console.
2. Run the setup snippet below, close DevTools, then start a 10-minute session
   from Butu's toolbar popup with task `Study database systems`.
3. Follow the shared timing checks below. Inspect state by opening the service
   worker console and running the snapshot snippet after each checkpoint.
4. Stop the session, verify `offTaskTiming` is `null`, and run the restore snippet.

## Manual installed-extension checks — Firefox

1. Run `./build.sh`. Open `about:debugging#/runtime/this-firefox`, select **Load
   Temporary Add-on**, and choose `dist/firefox/manifest.json` (or Reload the
   existing Butu), then refresh test web tabs. Click Butu's **Inspect** button.
2. In its console run the setup snippet below, close the toolbox, then start a
   10-minute session from Butu's toolbar popup with task `Study database systems`.
3. Follow the shared timing checks below. Inspect state by reopening Butu's
   toolbox and running the snapshot snippet after each checkpoint.
4. Stop the session, verify `offTaskTiming` is `null`, and run the restore snippet.

Setup (preserves existing domain settings locally):

```js
chrome.storage.local.get(['allowlist', 'blocklist'], saved => {
    chrome.storage.local.set({
        timingTestSavedRules: saved,
        allowlist: ['example.com'], blocklist: ['example.org', 'example.net'],
    });
});
```

Snapshot (opening a detached inspector may itself pause counting):

```js
chrome.storage.local.get('offTaskTiming', ({ offTaskTiming: timing }) => {
    console.log(JSON.stringify(timing, null, 2));
});
```

Shared timing checks, repeated in **each browser**:

1. Visit `https://example.org/` in tab A and keep its window focused for about
   20 seconds. Its `tabs[tabId].seconds` should be about 20. Use the background
   verdict log's `source: 'blocklist'` to confirm deterministic classification.
2. Switch to a new tab B at `https://example.net/` for about 10 seconds. A stays
   near 20; B reaches about 10. Return to A for 5 seconds: A resumes near 25,
   while B stays near 10. Allow a second for reporting and normal inspection delay.
3. With A selected, switch to another application for 20 seconds. Return to A
   briefly, then inspect: its total must not include those 20 seconds. Repeat
   with the browser minimized. Keep a second browser window visible but unfocused
   on B; only the selected tab in the focused window may accumulate time.
4. Focus A and click the address bar without navigating for 5 seconds: time still
   counts. Reload A, then navigate in A to `https://example.org/?timing=2`:
   its total is retained and resumes after classification. Back/forward must
   also pause/resume correctly without starting multiple reporting intervals.
5. Switch to `https://example.com/` for about 30 seconds, then return to A:
   A and B retain their totals. Spend 5 seconds on A (breaking the reset streak),
   then return to example.com for 61 uninterrupted seconds. Inspect: both A and B
   are now zero. Return to A: its timer starts from zero again.
6. Select a browser internal page or Butu's diary for 20 seconds: neither creates
   a timing entry, adds off-task time, nor earns on-task reset time.
7. Close B: its timing entry disappears. Stop the session from the popup:
   `offTaskTiming` becomes `null`; waiting on A cannot recreate it. Start another
   session: A begins at zero. Repeat with a 1-minute session and let it expire:
   timing clears without opening the popup.

Restore domain settings after stopping the test session:

```js
chrome.storage.local.get('timingTestSavedRules', ({ timingTestSavedRules: saved }) => {
    if (!saved) return;
    chrome.storage.local.remove(['allowlist', 'blocklist'], () => {
        chrome.storage.local.set(saved, () => chrome.storage.local.remove('timingTestSavedRules'));
    });
});
```
