# Definition of done (task 4.10)

The checklist below follows the eight release requirements at the end of
`SPEC.md`, including decision 23's bundled-only audio revision. Runtime TTS,
API-key setup and TTS-budget settings are deferred, not release failures.

## Reproduce the automated run

```
./build.sh
node --test tests/*.test.js
node tests/browser-audit.cjs chrome
node tests/browser-audit.cjs firefox
node tests/browser-audit.cjs chrome --full
node tests/browser-audit.cjs firefox --full
node tests/browser-summary.cjs chrome
node tests/browser-summary.cjs firefox
node tests/browser-diary.cjs chrome
node tests/browser-diary.cjs firefox
```

Run these browser commands sequentially: they share a local fixture port and
Firefox automation port. No dependencies, runtime keys, extra extension
permissions or remote inference are needed. Each full run takes several minutes:
stage thresholds, music duration and the one-minute expiry use the real clock.
`BUTU_AUDIT_PORT` can select another fixture port for independent runs;
`BUTU_AUDIT_RESULTS`, `BUTU_CHROME` and `BUTU_FIREFOX` are also supported.
The local fixture uses authored database text; relevant YouTube is visited live,
with no domain override or replayed page text. Network auditing deliberately
uses local fixtures separately so website traffic cannot be mistaken for Butu.

Chrome 153 and Firefox 154 run headless with the real popup document opened
as an extension tab; dedicated summary/diary checks also verify layout and
settings persistence. Native media events establish decoding/playback, not a new
subjective listening review of the user-approved voice pack.

The full runner loads diagnostic copies of the built extension with a native
media-event observer. It does not change production timing, inference, detection
or audio methods. It starts/stops through actual popup controls, reloads the
popup, observes real semantic verdicts and waits for real alarm expiry with the
popup document unloaded. The full run samples extension renderer RSS while
observing session state. Network monitoring is a separate run, so debugger
attachment does not affect the memory measurement.

## Release checklist

| Definition of done | Chrome | Firefox | Evidence checked |
| --- | --- | --- | --- |
| Session starts from popup, countdown visible, clean summary at end | Pass | Pass | Real form, persisted end time after popup reload, manual stop and real one-minute expiry |
| Off-task page reaches every stage on schedule; return fully restores it | Pass | Pass | Unchanged 15/45/90/180 s thresholds; entire HTML plus heading/text node identity after fade |
| On-task pages, including a relevant YouTube video, stay untouched | Pass | Pass | Real local embedding verdict and live database-normalization video, no overrides; beyond grace |
| Bundled sound and custom Butu speech, no synthesis/key needed | Pass | Pass | Native playback at all four stages; three custom whispers once each, crayon, winding-down ending and return chime; separate offline pass |
| Diary opens from popup with history and settings | Pass | Pass | Real saved sessions/domains; settings, credits and bundled voice test; dedicated persistence/retention/validation regressions |
| Same source works in both browsers | Pass | Pass | Both built manifests; no browser-specific source fork; installed-extension runs plus unit suite |
| Peak session memory under 500 MB on this 4 GB machine | Pass | Pass | Scoped extension renderer RSS, cold model and later session samples, not JS heap or whole-browser RAM |
| Only Hugging Face model downloads; no runtime ElevenLabs; offline audio | Pass | Pass | `NETWORK-AUDIT.md` and `network-audit-checks.json`: native requests, negative controls, blocked-network inference and all stage media |

Completed run details and raw local report locations are recorded in
`definition-of-done-checks.json`. Earlier phase reports remain historical
measurements rather than claims about this final run.

## Memory accounting

Final sampled peaks: Chrome **451.6 MB**, Firefox **396.1 MB** (decimal MB).
There were 2217 and 1680 RSS samples respectively, including cold inference,
live YouTube detection, stage progression and expiry.

Chrome normally starts component-extension workers in a fresh profile. An early
broad `--extension-process` sum counted two unrelated extension workers, yielding
more than 500 MB. The full runner disables component background extensions with
`--disable-component-extensions-with-background-pages` and measures the remaining
Butu extension renderer(s), including popup, offscreen host, worker and audio.
This is a test-profile isolation flag; users do not need it to install Butu.
No model/session options were changed to obtain a passing result. A temporary
ONNX allocation/optimization experiment did not improve memory and was discarded.

Firefox measures its isolated Extensions process using
`ChromeUtils.getAllDOMProcesses()`. Both measurements use resident KiB from
`/proc/PID/status`, converted using 1024 bytes/KiB and 1,000,000 bytes/MB.
The browser's own process, website renderers and other extensions are outside
this scope, as established in decision 5. This is a sampled peak on the recorded
versions and hardware, not a universal browser memory guarantee.

## Exact manual checklist: Chrome

1. Build and load `dist/chrome` at `chrome://extensions` in a fresh profile. Open
   the popup, enter `DBMS assignment on normalization`, choose a duration and
   start. Confirm waking progress, countdown and toolbar badge. Close/reopen the
   popup; the stored end time and countdown must remain correct.
2. Visit a database article and
   `https://www.youtube.com/watch?v=GFQaEYEc8_8` without domain overrides.
   Confirm real `embedding` verdicts at threshold 0.13 in the service-worker
   console. Leave each visible longer than 15 seconds: neither may be haunted.
3. In diary Settings, put `localhost` on the always-on-task list and
   `127.0.0.1` on the always-off-task list; save. Use separate local fixture URLs
   (the automated runner supplies these), or substitute normal work/drift sites.
   Do not focus an input on the drift page while waiting.
4. Keep the drift tab visible and its window focused. At 15, 45, 90 and 180
   accumulated foreground seconds, verify cheerful doodles → rewritten headings
   → corrupted doodles/scribbling → abandoned Butu and central task text.
   Hear in-tune → slower → detuned → winding-down music, with custom speech at
   stages 2, 3 and 4. Stage 4 must wind down and stop. No key is requested.
5. Switch to the on-task tab. After about two seconds the drift page must have
   its exact original content/nodes and no overlay. Hear the return chime followed
   by silence. Stop from the popup; check time, wanders, waited minutes and copy.
6. Open our diary using the popup link. Confirm the saved task/date/stats/caption,
   drawing and distracting domains. Open Settings; save and reopen domain lists,
   volume and mute. Test the bundled voice unmuted; mute must suppress it. Confirm
   ElevenLabs attribution and no key/TTS-budget controls.
7. Start a custom one-minute session, close the popup and wait for actual expiry.
   Confirm summary/history update exactly once, no haunting/audio, and no
   offscreen document. Use Shift+Esc to record Butu process memory during cold
   inference and after stop; separate other extension and website processes.
8. Repeat cached detection, diary/settings and all audio with external network
   disconnected. Follow `NETWORK-AUDIT.md` for the cold/native Network inspection.

## Exact manual checklist: Firefox

1. Build and load `dist/firefox/manifest.json` through `about:debugging` → This
   Firefox → Load Temporary Add-on in a fresh profile. Start the same task from
   the popup. Check progress/countdown/badge, then close and reopen the popup.
2. Without domain overrides, visit a database article and the same live YouTube
   video above. Inspect the extension's `embedding` verdicts; leave each visible
   past the grace period and confirm no haunting.
3. Save `localhost` / `127.0.0.1` as the work/drift overrides in diary Settings.
   Keep the off-task local page visible with its window focused, no field focused.
4. Wait through the actual 15/45/90/180 foreground-second thresholds. Check each
   visual and the same bundled music/three custom whispers. Let stage 4 stop.
5. Return to work and wait for the fade. Verify exact page restoration and the
   return chime/silence. Stop in the popup; verify the complete summary.
6. Open the diary from the popup and inspect the new saved page/domains. Save,
   reload and test settings, volume/mute and bundled preview; confirm attribution.
7. Start one custom minute and unload the popup. Wait for expiry and verify one
   archive, no further haunting/audio and model-worker release in the extension
   inspector. Record Extensions memory in `about:processes` during cold inference
   and after stop, in an isolated profile.
8. Disconnect external network after caching and repeat inference, settings voice
   test and stage audio. Use the native-channel network audit to include worker
   requests and distinguish Mozilla system-principal traffic from the extension.
