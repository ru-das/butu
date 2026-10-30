# Task 3.2 installed-browser verification

Run on 2026-10-30 against commit `ad6fc8e`, built with `./build.sh`.
Chrome **153.0.8010.12** and Firefox **154.0.1** ran as headed browsers in fresh
profiles on isolated Xvfb desktops with the Awesome window manager. The normal
extension distributions were installed without source changes or API mocks.

The scenarios in [OFF-TASK-TIMING.md](OFF-TASK-TIMING.md) were driven through
browser/extension APIs and actual keyboard/window-manager input. The popup UI
was opened as an extension tab; its real form and stop button controlled sessions.
Reading local extension storage through CDP/Marionette kept the inspector from
stealing focus. A separate X11 application supplied genuine browser focus loss.
The clocks, stage timings and reset threshold were unchanged. Reset and expiry
waits ran at normal speed.

Local HTTP fixture pages replaced the example domains: `127.0.0.1` was
blocklisted and `localhost` allowlisted. This made verdicts deterministic without
model downloads. The tests covered timing and routing, not embedding accuracy.
Fresh profiles contained no user browsing data or ElevenLabs key.

| Scenario | Chrome | Firefox |
|---|---|---|
| 20 s on foreground A | +20.000 s | +20.185 s |
| 10 s on B, A hidden | A +0; B +10.000 s | A +0; B +10.002 s |
| Return to A for 5 s | +5.000 s | +4.999 s |
| Another application focused for 20 s | +0; browser reports unfocused | +0; browser reports unfocused |
| Browser minimized for 20 s | +0; minimized state confirmed | +0; minimized state confirmed |
| Two visible windows, 6 s on A | A +5.998 s; unfocused B +0 | A +6.045 s; unfocused B +0 |
| Address bar focused for 5 s | +5.351 s | +5.154 s |
| Reload | Total retained: 42.947 → 45.450 s | Total retained: 42.857 → 45.696 s |
| Navigate using address bar | Total retained: 45.450 → 48.619 s | Total retained: 45.696 → 49.633 s |
| Back/forward keys, then 5 s | URLs confirmed; +4.999 s | URLs confirmed; +5.067 s |
| About 30 s on task | Both off-task totals retained | Both off-task totals retained |
| Return off task for 5 s | Reset streak becomes 0 | Reset streak becomes 0 |
| 61 s on task | A and B both reset to 0 | A and B both reset to 0 |
| Return off task after reset | Starts fresh: 4.187 s | Starts fresh: 4.047 s |
| Internal page for 20 s | No entry; off-task delta 0; reset streak 0 | No entry; off-task delta 0; reset streak 0 |
| Diary for 20 s | No entry; off-task delta 0; reset streak 0 | No entry; off-task delta 0; reset streak 0 |
| Close B | Pass in focused follow-up and 12 repeated background-window closes | Entry removed |
| Stop with A open, then wait | Session and timing remain null | Session and timing remain null |
| New session | Fresh A total: 3.008 s; no old B entry | Fresh A total: 3.015 s; no old B entry |
| Real one-minute session expiry, no popup interaction | Session and timing both null | Session and timing both null |

One-second reporting means the storage snapshot can trail the actual active
interval by about one second; active checks allowed two seconds of tolerance.
Pause checks compared snapshots after the focus/visibility transition settled.

## Test setup corrections and cleanup follow-up

Firefox's initial Marionette profile enabled `focusmanager.testmode`, causing its
window API to report focus despite the X11 focus change. The recorded Firefox
run explicitly set this preference to **false** and confirmed that the other
application owned OS focus. This was a test-profile change, not extension code.
Mozilla documents the [automation preferences and user overrides](https://firefox-source-docs.mozilla.org/testing/geckodriver/Profiles.html).

An initial Chrome harness used extension API navigation and had no forward-history
entry. The recorded run used actual address-bar entry and Alt+Left/Alt+Right,
verifying the resulting URLs before checking the timer.

Chrome's full timing run still saw B's entry in its first 800 ms cleanup probe.
A focused follow-up passed, then the original diary/background-window setup was
repeated 12 times. Every repeated close had removed the entry by its first
snapshot, taken 253–258 ms after removal. No persistent cleanup failure was
reproduced; no extension code was changed during this verification.

Temporary browsers, fixture servers and virtual desktops were closed after each
run. The user's browser profiles and desktop were not used.
