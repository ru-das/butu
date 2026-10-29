# Task 0.6 — message-triggered bundled audio

The Firefox background page and Chrome offscreen document import the same
`src/model-host/audio-probe.js`. A `phase0:play-audio` extension message plays
`assets/audio/test-chime.mp3` at 30% volume; another message restarts the same
player. Playback rejection returns `{ playing: false }` without a warning,
dialog or page modification. The successful reply means playback started;
the automated checks also wait for the native `ended` event.

Chrome declares `WORKERS` and `AUDIO_PLAYBACK` reasons under its existing
`offscreen` permission. Its service worker ensures the host exists, forwards
the message with `target: 'model-host'`, and returns the playback result.
Concurrent creation requests share one promise. This allows a later probe
after Chrome closes the document following silence. No new permission,
network host, content script or autoplay override is used.

The original synthesized chime is 14,045 bytes, about 1.75 seconds including MP3
padding. [Credits and CC0 dedication](../../assets/audio/README.md).
ElevenLabs characters used: **0**.

## Manual check — Firefox

1. Run `sh experiments/phase0/prepare.sh` from the repository root.
2. In `about:debugging` → **This Firefox** → **Load Temporary Add-on**, select
   `/home/rupam/butu/experiments/phase0/manifest.json`.
3. Click **Inspect** for Butu. In its console, evaluate
   `chrome.runtime.getURL('src/model-host/audio-test.html')`. Open the returned
   `moz-extension://…` URL in a separate tab. Keep the background inspector open
   for this short test; the default 10-minute lifetime is task 0.7.
4. Open the audio-test tab's Web Console and run the command below. Switch to
   an ordinary website tab within five seconds. Leave that tab focused and do
   not click anywhere on the page.
5. Hear the quiet three-note chime. Return to the audio-test console and confirm
   `{ playing: true }`. Repeat the command to replay. Check that no errors or
   changes appeared on the website. Remove the temporary add-on afterwards.

## Manual check — Chrome (116+)

1. Run `sh experiments/phase0/prepare.sh` from the repository root.
2. In `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**,
   and select `/home/rupam/butu/experiments/phase0/chrome/`.
3. Copy the extension ID and open
   `chrome-extension://<ID>/src/model-host/audio-test.html` in a tab.
4. Open that tab's DevTools Console and run the command below. Switch to an
   ordinary website tab within five seconds. Leave it focused without clicking
   the page. Hear the chime, then return to confirm `{ playing: true }`.
5. Repeat after 35 seconds of silence to exercise host reuse/recreation.
   The service-worker console reports host creation; playback occurs in
   `offscreen.html`. Remove the test extension afterwards.

Use this command in either audio-test tab's console:

```js
setTimeout(() => chrome.runtime.sendMessage({ type: 'phase0:play-audio' }).then(console.log), 5000)
```

If the OS output is muted, unmute it and repeat. Playback blocking fails silently
and reports `playing: false`; it does not request a click on the website.

## Automated checks and evidence

Run these sequentially, on an isolated graphical display if available:

```sh
node --test tests/*.test.js
sh experiments/phase0/prepare.sh
# Separate terminal: an ordinary HTTP fixture, with no extension/content script.
python3 -m http.server 8769 --bind 127.0.0.1 --directory assets/audio
# Back in the first terminal (set DISPLAY to the test display as needed):
BUTU_CHROME=/path/to/chrome-for-testing \
  BUTU_AUDIO_RESULTS=/tmp/butu-audio-chrome-new \
  node experiments/phase0/src/model-host/audio-check.cjs
BUTU_AUDIO_RESULTS=/tmp/butu-audio-firefox-new \
  python3 experiments/phase0/src/model-host/audio-firefox.py
```

Use fresh output directories. The verifiers copy the prepared extension to an
isolated profile, run only its audio import (avoiding unrelated model downloads),
and observe native media events. Firefox sends from a timed extension-page script;
Chrome evaluates `sendMessage` in the sender tab with `userGesture: false`.
No autoplay preference or launch flag is changed. Firefox's test profile disables
first-run prompts; it does not extend the background idle timeout.

On 2026-10-29, both graphical browser checks passed on Xvfb:

| Browser | Host | Message reply | Native playback | Website focus | User activation |
| --- | --- | --- | --- | --- | --- |
| Chrome for Testing 153.0.8010.12 | Offscreen document | `playing: true` | `playing` → `ended`, 1.750 s | Visible and focused before/after | False on website and host |
| Firefox 154.0.1 | Background page | `playing: true` | `playing` → `ended`, 1.750 s | Visible and focused before/after | False on website and host |

The final sequential run routed browser output through a temporary PulseAudio
null sink and captured its monitor as signed 16-bit PCM at 44.1 kHz. Chrome
produced 75,406 nonzero samples (peak 1,179); Firefox produced 75,412 (peak 1,180).
The sink was removed afterwards. This proves decoded audio reached the output
pipeline. An earlier repeat through the default hardware device started playback
but stalled before `ended`; the isolated-sink run completed in both browsers.

To repeat output measurement on Linux, create a temporary sink with
`pactl load-module module-null-sink sink_name=butu_audio_probe`, launch each
verifier with `PULSE_SINK=butu_audio_probe`, and record its output in a separate
terminal with `ffmpeg -f pulse -i butu_audio_probe.monitor -ac 1 -ar 44100
-c:a pcm_s16le /tmp/butu-audio-proof.wav`. Stop the recorder after the test, then
remove the sink with `pactl unload-module <module-id>` using the ID returned when
creating it. The monitor contains only audio directed to this test sink.

Raw results, including PCM measurements: [Chrome](results/2026-10-29-audio/chrome.json),
[Firefox](results/2026-10-29-audio/firefox.json).
These checks establish unmuted native playback through completion, not a human
listening assessment of the speakers. Unit checks cover wrong-message/sender
filtering, restart, playback rejection, and Chrome host recreation after closure.
This short probe does not complete task 0.7's background-lifetime investigation.
