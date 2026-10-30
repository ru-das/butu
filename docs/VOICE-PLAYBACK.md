# V5: stage playback

`src/voice.js` owns a single music player and a serial one-shot queue in the
model host. The background derives audio state from the persisted session and
foreground timing owner, then routes it through `src/model-host/client.js`.
Chrome's offscreen document receives runtime messages (it cannot read storage);
Firefox uses the same queue in its background page. Page scripts never play audio.
No new dependency, permission, network host, API request or ElevenLabs character
submission is involved. Existing audio sources/credits remain in their manifests
and `docs/voice-design.md`; ElevenLabs recordings require attribution and
noncommercial use under the recorded Free-plan terms.

## Playback

- Stage 0: silence. Stage 1: bundled in-tune music box fades in.
- Stage 2: slower music + `butu-06` ("Our work is still waiting.").
- Stage 3: detuned music + crayon SFX followed by `butu-08`
  ("It gets very quiet when you leave.").
- Stage 4: winding-down music, **not looped**, + `butu-12`
  ("Your chair is still here.").
- Music stages 1–3 loop. Crossfades use Web Audio gain automation over 1200 ms.
  Default mix volume is 0.25, configured in `src/config.js`. One-shot speech
  is serial; pending speech is discarded on a stage/visit/session change, with
  existing speech fading before the new queue begins.
- Return to a foreground on-task page fades haunting audio over 2000 ms and plays
  the happy return chime once. A transient unknown verdict during tab switching
  does not swallow the chime. Unknown/internal pages and unfocused windows fade
  to silence without a chime. Session end fades without a return chime.
- `storage.local.volume` is clamped to 0–1; `muted: true` fades to silence.
  Unmute resumes the current music. Diary controls are task 4.5.
- Each selected whisper is reserved before attempting playback, once per visit.
  Switching tabs/returning to work does not clear reservations; a navigation or
  reload starts a new visit, including a same-URL reload. Per-tab accumulated
  off-task seconds are preserved. Only current visits for open tabs are retained
  in host memory, cleared at session end. Host/browser destruction discards this
  transient history; an extension reload is a fresh playback lifetime.
- Blocked playback and media errors fail silently, without retrying whispers.
  Faded/ended players disconnect and discard their media sources. Session end
  closes the AudioContext after the fade. The Firefox host uses the existing
  session heartbeat; both hosts also enforce the session deadline locally.

## Automated verification

Completed on 2026-10-30: Chrome 153.0.8010.12 and Firefox 154.0.1 pass 23
checks each; all 39 unit tests pass. Actual speaker recordings contain the
playback sequence and over 30 seconds of digital silence after the winding-down
clip. Compact results and raw recording locations: `docs/voice-playback-checks.json`.

Run:

```sh
./build.sh
node --test tests/*.test.js
node tests/browser-voice.cjs
```

The browser check requires locally installed Chrome/Firefox, PulseAudio-compatible
speaker monitoring and ffmpeg. Set `BUTU_CHROME` / `BUTU_FIREFOX` to override
the browser executables. It launches isolated profiles with default autoplay
policy, uses local allowlisted/blocked pages, and advances only the stored elapsed
seconds to visit stages without a three-minute wait. Production timings and audio
assets are unchanged. The longer stage-4 hold checks more than 30 seconds of
silence after the music ends. Test copies prepend an observer to the host; it records native
media events, host gain samples and queue state, with no playback-policy overrides. Results and actual
speaker-monitor WAV recordings are saved under `.local-reports/v5/run-*` (ignored).
This is objective playback/output verification; subjective listening remains human.

## Exact manual checks — Chrome

1. Run `./build.sh`. In `chrome://extensions`, enable Developer mode and load/reload
   `dist/chrome`. Use a comfortable OS volume, with no other audio playing.
2. Open Butu's popup. In the popup inspector console, run
   `chrome.storage.local.set({allowlist:['localhost'],blocklist:['127.0.0.1'],volume:0.25,muted:false})`.
   Start `python3 -m http.server 8776 --bind 0.0.0.0` from this repo.
3. Open `http://localhost:8776/tests/content-timing.html` as the work tab, and
   `http://127.0.0.1:8776/tests/content-timing.html` as the drift tab. Start a
   10-minute session for "Study database systems". Keep the drift tab focused.
4. Hear silence until 15 s; at 15 s hear the in-tune lullaby. At 45 s hear a smooth
   change to slower music and "Our work is still waiting." At 90 s hear detuned
   music, crayon scribbling, then "It gets very quiet when you leave."
   At 180 s hear the final line and winding-down variant. Wait 35 s: the music
   must stop and stay stopped. Confirm the matching visual stages throughout.
5. Switch to the work tab. Hear one happy chime; any haunting audio fades over
   about 2 s. Switch back within 60 s: already-heard whispers must not repeat.
   Reload the drift page: its current-stage whisper may play once for the new visit.
6. In the popup inspector, set `chrome.storage.local.set({muted:true})`; sound
   fades out. Set `{muted:false}`; music resumes without repeating a reserved
   whisper. Set `{volume:0.1}` and confirm a smooth quieter mix.
7. Stop the session during a whisper or music transition: sound fades out, no
   queued line plays later. In the offscreen inspector, confirm no media error
   escapes into the page. Disconnect networking and repeat: all audio still works.
8. Clear the test overrides in the popup inspector:
   `chrome.storage.local.remove(['allowlist','blocklist','volume','muted'])`.

## Exact manual checks — Firefox

1. Run `./build.sh`. In `about:debugging` → This Firefox → Load Temporary Add-on,
   select `dist/firefox/manifest.json` (or Reload the existing Butu extension).
2. Open Butu's popup inspector, set the same overrides from Chrome step 2, and
   use the same local server and two URLs from steps 2–3.
3. Perform Chrome steps 4–8 exactly, with Firefox focused. Close the popup while
   listening: playback must continue from the background page. Use Inspect from
   `about:debugging` for background errors; no offscreen page exists in Firefox.
4. Repeat a run without opening the background inspector, including more than
   30 seconds of stage-4 silence and the subsequent return chime. This exercises
   the existing Firefox session heartbeat with no debugger keeping it alive.
