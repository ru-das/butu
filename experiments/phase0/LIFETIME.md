# Task 0.7 — Firefox event-page lifetime

2026-10-29. Firefox suspension was observed, and the user subsequently approved
the proposed heartbeat. It is now implemented as an opt-in Phase 0 session probe.
No permission, network host or dependency was added. Full stored-session recovery
remains task 1.5; the heartbeat does not replace it.

## Can a 45-minute session lose its background page?

Yes. Firefox MV3 background documents are non-persistent event pages. Omitting
`persistent` means `false`; setting it to `true` is an MV3 error. Butu's existing
`background.page` manifest therefore does not promise a resident host throughout
a session. An idle page is unloaded, not merely paused with its heap preserved.
[MDN background manifest reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background).

An isolated Firefox 154.0.1 / Marionette check reused the task-0.6 audio fixture,
with the embedding benchmark disabled, the default autoplay policy and no
background-idle override. Before opening any extension view or debugger, the
parent-process state readout reported:

| Observation | Value |
| --- | --- |
| Default `extensions.background.idle.timeout` | 30,000 ms |
| Initial background state | `running` |
| State after 45 seconds without extension views or messages | `stopped` |
| State after opening the audio test page / its delayed message | `running` |

This samples suspension within 45 seconds; it does not measure the exact unload
instant or isolate which action restarted the page. The subsequent audio check
failed to obtain a playback reply/events while Firefox reported disk-quota errors
in its temporary profile. That audio result is **inconclusive**, not proof of a
playback regression or successful wake-and-play. The test's temporary duplicate
vendor files were removed and its isolated browser was stopped. No model was
loaded, no memory measurement was taken, and no ElevenLabs request was made
(0 characters). Browser-internal first-run traffic is not extension traffic.

The earlier model/cache harnesses request a 600,000 ms idle timeout and/or keep
inspection open. Their timing/memory/cache results remain useful, but cannot
establish default event-page lifetime. The short task-0.6 playback evidence also
does not establish uninterrupted long audio.

## Consequences for Butu

- **Session:** in-memory state and JavaScript timers disappear. Store task,
  session identifier, end timestamp and recovery state in `chrome.storage.local`.
  Compute remaining time from that timestamp and use `chrome.alarms` for expiry.
  Register wake-capable API listeners synchronously; restore state inside handlers.
  Alarms are wake-up mechanisms, not an uninterrupted-audio guarantee.
- **Embeddings:** unloading the owner document destroys its dedicated worker,
  loaded model/WASM state, outstanding work and in-memory score cache. Reload
  lazily on the next uncached request; downloaded model files remain in the
  browser's persistent cache, subject to eviction. Independently, our existing
  five-second idle worker termination remains intentional and must stay enabled.
- **Audio:** destroying the document destroys its players, queue, decoded buffers
  and session-only personalised clips; playback cannot continue in that document.
  Do not assume playing audio, a running worker, or an ordinary JS timer prevents
  idle unloading. Bundled clips can be loaded again. If personalised clips are
  lost, use the base pack rather than silently sending another session-start TTS
  request. Worker idle release alone does not affect host audio.

[MDN's event-page migration guidance](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Background_scripts)
supports synchronous listeners, persisted state and alarms in place of timers.
[Firefox's current background implementation](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/toolkit/components/extensions/parent/ext-backgroundPage.js)
resets idle on parent API activity and exempts attached DevTools; this is an
implementation detail to verify on supported versions, not a public keep-alive API.

## Approved implementation

`src/model-host/firefox-session-lifetime.js` implements a **session-scoped
heartbeat in the host document**, calling `chrome.runtime.getPlatformInfo()`
immediately and every 20 seconds until the supplied absolute end timestamp.
`FIREFOX_HEARTBEAT_MS` lives in `src/config.js`. The parent API call, rather than
the JS interval alone, resets event-page idle. Invalid/expired deadlines reject;
stop, replacement, expiry and API failure clear the timers and invoke caller
cleanup. A late API rejection cannot stop a newer session. Each heartbeat and
probe request checks wall-clock expiry, covering delayed timers after sleep.

The Firefox-only `background.html` imports an experiment probe; Chrome's offscreen
document does not. Loading the extension does not start a heartbeat. Open
`src/model-host/lifetime-test.html` and explicitly start a timed probe. Same-extension
messages route status, audio, inference and stop requests. The probe uses the
existing benchmark host when present, keeping one embedding host/worker. Its end
callback releases the worker and score cache and stops/resets its bundled player.
No heartbeat keeps the model loaded. A 45-minute session would make approximately
135 local heartbeat calls. There is no silent audio keep-alive or preference change.

This is not a guarantee against browser termination,
sleep, delayed timers, process crashes or future Firefox lifecycle changes.
On wake, re-read the end timestamp before routing any work or resuming audio;
discard expired session work, reload embeddings on demand and fall back to
bundled voice if session audio was lost. If the heartbeat fails the endurance
test, stop and request a revised approach rather than adding another mechanism.
Storage/alarms permissions belong to the later session implementation and need
approval before being added; this change does not add them. The probe accepts an
explicit deadline in memory; it does not claim to implement persisted recovery.

## Repeat automated verification

```sh
node --test tests/*.test.js
sh experiments/phase0/prepare.sh
BUTU_LIFETIME_RESULTS=/tmp/butu-lifetime-new \
  python3 experiments/phase0/src/model-host/lifetime-firefox.py
```

Use a fresh output directory and a graphical display (or prefix the Python
command with `xvfb-run -a` on Linux). Native audio needs a working output device;
the recorded run uses a temporary PulseAudio null sink to avoid hardware stalls:

```sh
pactl load-module module-null-sink sink_name=butu_lifetime_probe
BUTU_LIFETIME_RESULTS=/tmp/butu-lifetime-new \
  PULSE_SINK=butu_lifetime_probe xvfb-run -a \
  python3 experiments/phase0/src/model-host/lifetime-firefox.py
```

Remove the sink afterwards with `pactl unload-module <returned-module-number>`.
Optionally set `BUTU_LIFETIME_CACHE_PROFILE` to a **previous isolated test** profile
containing the model cache. Only storage and extension UUID preferences are
copied; idle/autoplay settings are not inherited. The original profile is never
opened or changed. Without a warm cache, first inference may download permitted
Hugging Face model files. The verifier leaves the eager ranking benchmark out of
its temporary copy so all inference is session-triggered.

The roughly 13-minute check observes Firefox's parent-process background state
without waking it or attaching extension DevTools. All quiet samples require
only a background view. It routes start/inference/audio, loops the real bundled
MP3 for 75 seconds, verifies worker idle release, replaces the loop with a finite
clip, and waits to 665 seconds total. It then checks the same host instance,
native completion, fresh uncached inference, audio and immediate cleanup on stop.
After 45 quiet seconds the host must suspend. A new message must wake a new,
inactive instance. A separate five-second session verifies deadline cleanup and
subsequent suspension. These are Phase 0 probe sessions, not the future product UI.

Unit checks cover inactive installation, deadline validation, manual stop,
expiry, replacement, stale API failure, active API failure and a wall-clock jump.
The Chrome audio verifier also now waits for document readiness before attaching
its native-player observation, avoiding a startup-navigation race.

## Exact manual verification

### Firefox — heartbeat and cleanup

1. Run `sh experiments/phase0/prepare.sh`. In `about:debugging` → This Firefox →
   Load Temporary Add-on, choose `experiments/phase0/manifest.json`.
2. Allow the existing model benchmark to finish while Inspect is open. In its
   console obtain `chrome.runtime.getURL('src/model-host/lifetime-test.html')`.
   Save that URL, open it in a tab, then close **all** extension inspectors.
3. Leave the duration at 12 minutes, click Start, and record `instance` and
   `endsAt`. Click Embed a new title and Play bundled chime. Close the test tab
   and leave an ordinary website focused for 11 minutes. Keep popup, diary and
   all other extension views closed. Do not change the idle preference.
4. Reopen the saved URL before the 12-minute deadline and click Status. Confirm
   the same `instance`, an active deadline and `workerLoaded: false`. Click Embed
   a new title: expect `result.cached: false` and valid scores. Replay the chime.
5. Click Stop: expect `endsAt: null`, `endReason: stopped`, no loaded worker,
   zero cache entries and paused audio. Close the tab, wait 45 seconds, and check
   that `about:debugging` shows stopped without clicking Inspect.
6. Reopen the URL: Status must show a new instance and no session. Set duration
   to 1 minute, Start, play the chime, then close the tab. Reopen after 65 seconds
   and check `endReason: expired` and inactive resources. Close again, wait 45
   seconds and confirm host suspension. Remove the temporary add-on.
7. A full 45-minute product session, stage transitions, persisted recovery after
   a real crash, and real sleep/resume remain future integration checks.

### Chrome — regression check

1. Run the same prepare command. In `chrome://extensions` → Developer mode →
   Load unpacked, choose `experiments/phase0/chrome/`.
2. Open `chrome-extension://<ID>/src/model-host/audio-test.html`. With host and
   service-worker inspectors closed, run the same delayed message from that
   tab's console, switch to an ordinary page and confirm the chime/reply.
3. Wait 35 seconds of silence, then repeat to exercise host recreation. Close
   extension views and repeat after 11 minutes. Record errors or missing audio;
   do not infer success from the service worker being alive in DevTools.
4. After session implementation, repeat the full 45-minute sequence from Firefox,
   including expiry/recovery. The proposed Firefox heartbeat must not run here.
   Remove the temporary extensions after testing in both browsers.

## Phase 0 checkpoint

Prior evidence: MiniLM-L3 final fixture loads took Chrome 1,096 ms / Firefox
1,505 ms; sequential four-string inference took 95 ms / 61 ms. Largest observed
individual renderer HWM was 431.7 / 349.1 MiB, dropping to 167.9 / 137.0 MiB RSS
after release/quiet time. The Chrome cold candidate renderer sum reached
614.5 MiB: this is not a whole-browser 500 MB guarantee. See
[LOW-MEMORY.md](LOW-MEMORY.md) for attribution and cold/warm caveats.
[CACHE.md](CACHE.md) records both browsers' four cache hits and zero remote model
fetches on reload; [AUDIO.md](AUDIO.md) records short bundled playback reaching
native `ended` and the output pipeline in both browsers.

Task 0.7 and Phase 0 are complete at the experiment level. Phase 1 has not started.

## Recorded results — approved run

Firefox **154.0.1** passed the **665-second (11 min 5 s)** endurance interval with
the default **30,000 ms** idle timeout. Every quiet sample had no attached
extension debugger and no view other than the background document. The same
instance survived looping audio and the silent interval. At 75 seconds the
worker had unloaded while audio continued. The finite clip subsequently reached
native `ended` at 1.750204 seconds, and audio started again after 11 minutes.
Manual stop immediately paused audio, terminated the worker and cleared scores;
the host was stopped within the following 45-second observation. A message woke
a new, inactive instance. Five-second expiry stopped a playing loop and again
allowed suspension within 45 seconds.

Warm-cache embedding load/inference took **2,204 / 49 ms** initially and
**1,920 / 53 ms** after the long idle interval (one title plus task per request).
Both requests were uncached score computations, returning 0.35404026839665215
for normal form and 0.2663538474806193 for functional dependencies. This run does
not establish a production threshold or a cold-download time. Five seconds of
the isolated sink's mono 44.1 kHz PCM contained **213,699 nonzero samples**, peak
**1,180**, confirming looping audio reached the output pipeline. It is not a
human speaker-listening assessment. Quiet Firefox intervals used `about:blank`;
the ordinary-website focus/audio check remains covered by task 0.6.

Chrome **153.0.8010.12** passed the bundled-audio regression through native
`ended` (1.750125 seconds), with an ordinary website focused and no host/page
user activation. Its first verifier attempt hit a document-loading race; waiting
for document readiness fixed the verifier, with no Chrome runtime change.

All five Node test files, JS/Python syntax checks, staging and `git diff --check`
passed. No new memory peak was measured; the earlier memory numbers above remain
the Phase 0 budget evidence. A full 45-minute product run, stage audio integration,
actual crash/sleep recovery and final whole-extension memory measurement remain
later integration checks. No ElevenLabs calls were made: **0 characters**.

Evidence: [Firefox lifecycle and inference](results/2026-10-29-lifetime/firefox.json),
[Firefox output measurement](results/2026-10-29-lifetime/audio-output.json),
[Chrome audio regression](results/2026-10-29-lifetime/chrome.json).
