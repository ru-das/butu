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
