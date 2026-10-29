# Popup and session lifecycle (tasks 1.4–1.5)

The background owns `{ session: { task, startedAt, endsAt } }` in
`chrome.storage.local`. Times are Unix milliseconds. An ended session is `null`.
The popup sends `session:start` (task and whole minutes), `session:stop`, and
`session:get` through `chrome.runtime.sendMessage`; replies contain `{ session }`
or `{ error }`. Content scripts cannot issue these commands. Starting while a
session is active returns that session without changing its deadline.

Every popup tick calculates remaining time from `endsAt`; ticks never write
storage. Storage changes refresh open popups. Task text uses `textContent`.
The background schedules the named `butu-session-end` alarm and reconciles the
stored deadline on background load, browser startup, installation/update, alarm
delivery and session reads/starts. It restores missing alarms and clears expired
or invalid state. Commands and alarms are serialized to avoid start/stop races.
Stopping clears the active state and alarm; no history or summary is stored yet.
No models, network calls or audio are started by this task.

Browser alarms can be delayed by sleep or browser scheduling. The stored deadline
remains authoritative; an overdue session is cleared on the next wake/read.
See the [Chrome alarms reference](https://developer.chrome.com/docs/extensions/reference/api/alarms).

`butu.svg` is original static popup artwork created for Butu, dedicated to the
public domain under CC0 1.0 Universal:
https://creativecommons.org/publicdomain/zero/1.0/
It uses no external source art. The complete calm/corrupted on-page doodle pack
is task 3.3. Fonts and paper credits are in `../shared/README.md`.

## Verification

All 14 Node tests and both builds pass. The background test covers popup-independent
expiry, discarded-alarm recovery, overdue restart, duplicate starts, manual stop,
concurrent commands/stale alarms, sender restrictions and failed writes/scheduling.

An isolated Chrome extension-page check confirmed start, unchanged countdown
after navigating away/reopening, literal task rendering and manual stop clearing
state/alarm. Full browser expiry checks remain unconfirmed: the automation had
browser startup/readiness timeouts (including Firefox). Use the manual steps below.

Build with `./build.sh` first.

Chrome:

1. Open `chrome://extensions`, enable Developer mode, load unpacked
   `dist/chrome/` (or reload Butu). Pin Butu and open its toolbar popup.
2. Enter `Finish the DBMS assignment`, choose Custom → 1 minute, and start.
   Check the task, countdown and “Stop our session” button. Close the popup,
   wait 10 seconds and reopen: about `00:50` must remain.
3. Click “Stop our session”: the form returns. Reopen the popup: no countdown.
   In the service-worker console, check `await chrome.storage.local.get('session')`
   is `{session: null}` and `await chrome.alarms.getAll()` is `[]`.
4. Start another one-minute session. Close both popup and worker DevTools.
   Wait at least 65 seconds. Open the worker console before opening the popup:
   the same checks from step 3 must show no session or alarm. Open the popup:
   the start form must appear.
5. Start a one-minute session, reload the extension after 10 seconds, and reopen
   the popup: the countdown must keep its original deadline. Close it until the
   minute expires and verify step 4 again.
6. For missing-alarm recovery, start a session, run
   `await chrome.alarms.clear('butu-session-end')` in the worker console, reload
   the extension and check `await chrome.alarms.getAll()`: one alarm must match
   the stored `endsAt`. Stop the session afterwards.

Firefox:

1. Open `about:debugging#/runtime/this-firefox`, Load Temporary Add-on and choose
   `dist/firefox/manifest.json` (or reload Butu). Open its toolbar popup.
2. Repeat Chrome steps 2–6, using Inspect beside Butu for its background console.
   Firefox's `chrome.*` namespace uses callbacks; inspect storage with
   `chrome.storage.local.get('session', console.log)` and alarms with
   `chrome.alarms.getAll(console.log)`. Clear an alarm with
   `chrome.alarms.clear('butu-session-end', console.log)`.
3. Keep background DevTools closed during the one-minute expiry check. Reopen
   Inspect before the popup and verify `{session: null}` and `[]`.

In both browsers, also try an empty/whitespace task and fractional/zero custom
minutes: they must not start. Task markup such as `<b>Study DBMS</b>` must appear
literally. Popup resources should all use extension-local URLs.

Summary/history, detection, sound and model-host cleanup remain later tasks.
