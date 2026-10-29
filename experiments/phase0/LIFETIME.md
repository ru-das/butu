# Task 0.7 — Firefox event-page lifetime

2026-10-29. **Approval checkpoint, not a completed endurance test.** Firefox
suspension was observed. No keep-alive, permission, manifest or runtime change
has been implemented. The 10+ minute routing/audio verification remains pending.

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

## Proposed approach — requires approval

Keep recovery based on stored session state even with a keep-alive. For Firefox
only, propose a **session-scoped heartbeat in the host document**, calling
`chrome.runtime.getPlatformInfo()` every 20 seconds while the stored session is
active. Its parent API activity is expected to reset the observed 30-second idle
timer. A JS interval by itself is insufficient; the extension API call is the
relevant activity. Put the heartbeat interval in `src/config.js` and the Firefox
adapter in `src/model-host/`. This needs no new permission, host, dependency,
network traffic, content-script heartbeat or visible companion tab.

Stop the heartbeat at manual stop/expiry and release worker/audio resources. It
must not run merely because the extension is installed, and must not keep the
embedding worker loaded. It makes roughly 135 inexpensive local calls over a
45-minute session. Do not use a silent audio loop, change the user's Firefox
preferences, assume an idle message port guarantees lifetime, or switch to MV2.

This is a candidate to validate, not a guarantee against browser termination,
sleep, delayed timers, process crashes or future Firefox lifecycle changes.
On wake, re-read the end timestamp before routing any work or resuming audio;
discard expired session work, reload embeddings on demand and fall back to
bundled voice if session audio was lost. If the heartbeat fails the endurance
test, stop and request a revised approach rather than adding another mechanism.
Storage/alarms permissions belong to the later session implementation and need
approval before being added; they are not added by this proposal.

## Exact manual verification

### Firefox — current suspension check

1. Run `sh experiments/phase0/prepare.sh`. In `about:debugging` → This Firefox →
   Load Temporary Add-on, choose `experiments/phase0/manifest.json`.
2. For a cold model download, allow the model benchmark to finish while Inspect
   is open. Close **all** extension inspectors, popup and extension tabs. Leave
   Firefox focused on an ordinary page. Do not change the background idle pref.
3. Wait at least 45 seconds. Check the background status in `about:debugging`
   without clicking Inspect. Record whether it is stopped. This is a suspension
   check, not a session or continuous-audio pass.
4. Click Inspect only after recording that status. Obtain
   `chrome.runtime.getURL('src/model-host/audio-test.html')`, open it in a tab and
   close the extension inspector. In the test tab's console run:
   `setTimeout(() => chrome.runtime.sendMessage({type:'phase0:play-audio'}).then(console.log), 5000)`.
   Switch to an ordinary page within five seconds. Hear the chime; return and
   check `playing: true`. Then close all extension views again.
5. After approval/implementation, repeat for at least 11 minutes and then a full
   45-minute session: silent focus, delayed chimes, long music, stage transitions,
   an uncached embedding after idle, manual stop and expiry. Keep Inspect closed;
   persist diagnostic instance IDs/timestamps for later inspection. Verify no
   unexpected host replacement while active, worker idle release/reload, audio
   completion, correct expiry and host suspension after stop. Test sleep/resume
   and forced restart separately as recovery checks. These checks are pending.

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

Blocker: default Firefox host suspension. Task 0.7 remains unchecked pending
approval and successful 10+ minute verification; Phase 1 has not started.
