# Session history (tasks 4.1–4.2)

`storage.local.sessionHistory` is an oldest-first array of the last 50 ended
sessions. Each entry has `task`, `startedAt`, planned `endsAt`, actual `endedAt`
(Unix milliseconds), `elapsedSeconds`, `completed` (deadline reached), cumulative
`offTaskSeconds`, `timesWandered`, unique distracting `domains` (hostnames only),
and an authored `caption`. No page text, titles, paths or query strings are archived.
Time spent means wall-clock session time, including breaks; it is not a claim of
measured productive work. Off-task time uses only detected foreground intervals,
including the grace period, and never resets when the haunting stage resets.

A wander is a foreground off-task visit with positive measured time. Repeated
polls and repeated verdicts do not add wanders. Returning after leaving a tab,
refocusing the browser, or navigating/reloading starts another visit. Unknown,
excluded, hidden and unfocused intervals do not count. Timing checkpoints and
totals share `offTaskTiming`; closing a tab and the 60-second reset preserve totals.
Restart drops the uncheckpointed interval, as it does for the stage timer.
Cold background recovery after expiry archives only checkpointed off-task time;
it cannot charge time while the browser was closed. Normal stop/alarm/read
finalization flushes the last foreground interval.

Ending flushes the final interval up to the earlier of now and the deadline.
History and active-state cleanup share one queued storage write. Repeated stops,
stale alarms and recovery cannot archive the same session twice. A failed write
leaves the active session and history intact for retry. Failed starts are rolled
back without a history entry. Pre-feature sessions have only post-update totals.

## Exact manual checks for 4.1

Build with `./build.sh`. Use an isolated test profile if seeding storage.

Chrome:

1. Load/reload `dist/chrome` at `chrome://extensions`. Open Butu's service worker
   console and run `await chrome.storage.local.set({blocklist:['example.com'], allowlist:['example.org']})`.
2. Start a custom 3-minute session from the toolbar. Visit `https://example.com`
   in the focused window for 10 seconds, switch to `https://example.org` for
   65 seconds, return to example.com for 5 seconds, then close that tab and stop.
3. Run `await chrome.storage.local.get(['session','offTaskTiming','sessionHistory'])`.
   Check null active session/timing, one new entry, approximately 15 off-task
   seconds, 2 wanders, `domains: ['example.com']`, actual elapsed time, and a caption.
   Stop again: the array length must stay unchanged. Reopen the popup and reload
   the extension: history must persist.
4. Start a custom 1-minute session and close the popup and DevTools. After 65
   seconds, inspect history: exactly one new entry with `completed: true`,
   `elapsedSeconds: 60` and `endedAt === endsAt`.
5. In this test profile, seed 50 entries with
   `const {sessionHistory:h}=await chrome.storage.local.get('sessionHistory'); await chrome.storage.local.set({sessionHistory:Array.from({length:50},(_,i)=>({...h.at(-1),task:'Retention '+i}))})`.
   Start and stop another session. Verify length 50, first task `Retention 1`,
   latest task your new task. No request should send any stats to a server.

Firefox:

1. Load/reload `dist/firefox/manifest.json` via
   `about:debugging#/runtime/this-firefox`, then Inspect Butu.
2. Set the same lists with
   `chrome.storage.local.set({blocklist:['example.com'],allowlist:['example.org']},console.log)`.
   Repeat Chrome steps 2–4, reading state with
   `chrome.storage.local.get(['session','offTaskTiming','sessionHistory'],console.log)`.
   Keep Inspect closed during the expiry wait.
3. For retention, run
   `chrome.storage.local.get('sessionHistory',({sessionHistory:h})=>chrome.storage.local.set({sessionHistory:Array.from({length:50},(_,i)=>({...h.at(-1),task:'Retention '+i}))},console.log))`.
   Start/stop one more session and verify Chrome step 5's expected array.

## Popup summary (4.2)

The popup reads the newest history entry after the background reconciles expiry.
It shows elapsed time as minutes:seconds, wander count, off-task minutes rounded
to one decimal, and a stable line from `POPUP_SUMMARY_LINES`. It renders all
values with `textContent`. The summary survives reopening and extension reload;
starting a new session hides it. “Start another session” reveals the form.
The diary link is available in all states and opens the existing bundled
`src/diary/diary.html` in a tab. Diary history rendering remains task 4.3.

Exact manual checks for 4.2, Chrome:

1. Load `dist/chrome` at `chrome://extensions`. With no history, open the popup:
   the task form and “Open our diary” link appear, with no empty summary.
2. Start a session with task `<b>Study DBMS</b>`, wander as in the 4.1 steps,
   and stop. Check “Our time together”, literal task text (no bold markup),
   elapsed minutes:seconds, wander count, waited minutes, and a line from Butu.
3. Close/reopen the popup and reload the extension. The same summary and line
   must remain. Click “Open our diary”: a tab titled “Our diary — Butu” opens
   at the extension-local diary URL. No external URL or haunting appears.
4. Reopen the popup, click “Start another session”: the form returns with task
   focus. Start a custom 1-minute session. The old summary disappears and the
   countdown appears. Keep the popup open until expiry: the new summary replaces
   the countdown. Repeat with the popup closed during expiry, then reopen it.
5. Use Tab/Enter to activate both the diary link and start-again button. Check
   visible focus, all content fits the popup width, and no scrolling is needed
   for the normal summary. Long task text must wrap without horizontal overflow.

Exact manual checks for 4.2, Firefox:

1. Load `dist/firefox/manifest.json` at
   `about:debugging#/runtime/this-firefox` and open the toolbar popup.
2. Repeat Chrome steps 1–5 exactly. For expiry with the popup closed, also close
   Inspect, wait at least 65 seconds, then reopen the popup.
3. Verify the diary tab uses a `moz-extension://…/src/diary/diary.html` URL and
   “Our diary — Butu” title. The Chrome equivalent uses `chrome-extension://`.

## Automated verification

All 41 Node tests pass; both extension builds succeed. Lifecycle regressions
cover failed archive writes, failed-start rollback, duplicate stops, stale alarms
and cold recovery after expiry without charging browser downtime.

Installed Chrome 153.0.8010.12 and Firefox 154.0.1 each pass 11 checks: fresh
form, diary tab creation, stop/summary, literal task markup, reopen persistence,
repeat stop, start-again form, new-session summary hiding, overdue reconciliation,
50-entry retention and popup width. Both summary screenshots were visually
reviewed. Results: [session-summary-checks.json](session-summary-checks.json).

Reproduce with `./build.sh` then `node tests/browser-summary.cjs` (or add
`chrome` / `firefox` to select one). This launches isolated browser profiles
and a loopback HTTP fixture; no model download or audio-generation call is
needed. Use `BUTU_CHROME` / `BUTU_FIREFOX` for alternate browser binaries.
Profiles, JSON and screenshots go under ignored `.local-reports/summary/`.
Natural one-minute expiry and toolbar interaction use the manual steps above.
