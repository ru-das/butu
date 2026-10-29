# Popup (task 1.4)

The popup saves `{ session: { task, startedAt, endsAt } }` in
`chrome.storage.local`. Times are Unix milliseconds. Every visible tick and
popup open calculates remaining time from `endsAt`; ticks never change storage.
Storage changes refresh an open popup. Task text is rendered with `textContent`.

This task only supplies the popup and its persisted countdown. Background-owned
start/stop, alarms and session cleanup are task 1.5. An expired timestamp returns
the popup to the form with a brief thank-you; it is retained in storage for now.
No models, network calls or audio are started by this task.

`butu.svg` is original static popup artwork created for Butu, dedicated to the
public domain under CC0 1.0 Universal:
https://creativecommons.org/publicdomain/zero/1.0/
It uses no external source art. The complete calm/corrupted on-page doodle pack
is task 3.3. Fonts and paper credits are in `../shared/README.md`.

## Manual verification

Automated smoke checks passed in isolated Chrome and Firefox 154.0.1 extension
pages (opened in tabs): form validation, custom-field focus, literal task markup,
stored deadline unchanged after leaving/reopening the page, and expiry returning
to the form. Both rendered pages were inspected. All 13 Node tests and both builds
passed. The actual toolbar close/reopen steps below remain manual checks.

Build with `./build.sh` first.

Chrome:

1. Open `chrome://extensions`, enable Developer mode, Load unpacked and select
   `dist/chrome/` (or reload Butu). Pin Butu and click its toolbar icon.
2. Check the smiling, waving bear, greeting, task field, 25/45/60-minute choices,
   Custom option and “Let's do it together!” button. Tab through all controls;
   focus must be visible. Try an empty task and a two-character task: neither
   should start. Try three spaces: a readable validation message should appear.
3. Choose Custom: Minutes appears and receives focus. Try blank, zero, negative
   and fractional minutes; none should start. Switch back to 25 minutes: the
   custom field disappears and no longer blocks submission.
4. Enter `Finish the DBMS assignment`, choose Custom → 1 minute and start.
   Check the task and decreasing `01:00` countdown. Close the popup, wait about
   10 seconds, reopen: it must show about `00:50`, without resetting.
5. Close it until the minute has elapsed, then reopen: the form and thank-you
   should appear. Start another session to check that it works again.
6. Inspect the popup: Network should contain extension-local assets only; the
   console should have no errors. Test offline and with reduced motion enabled:
   fonts/art remain visible, with no animation. A task containing `<b>text</b>`
   must appear literally while the countdown is running.

Firefox:

1. Open `about:debugging#/runtime/this-firefox`, Load Temporary Add-on and choose
   `dist/firefox/manifest.json` (or reload Butu). Click its toolbar icon.
2. Repeat Chrome steps 2–5 exactly, including closing/reopening the actual
   toolbar popup during and after the one-minute session.
3. Inspect the popup using the Browser Toolbox. Repeat Chrome step 6; requests
   should use only `moz-extension://` URLs. Use File → Work Offline for the
   offline check, then turn it off afterwards.

Timer alarms, manual stop, badge, summaries, detection and sound are later tasks.
