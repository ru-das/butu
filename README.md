# Butu

Butu is a little hand-drawn teddy bear who keeps you company while you work.
Wander onto an off-task page and Butu gets lonely: cheerful crayon doodles
gradually turn strange, headings whisper about your task, and a music box
slows down and slips out of tune. Return to work and the page is restored.
No gore, jump scares or screaming.

A desktop browser extension for Chrome and Firefox (Manifest V3), built with
plain JavaScript, HTML and CSS. A small embedding model runs inside the browser
to compare pages with your task. Character text uses authored templates.

## Install

Download or clone this repository and open a terminal in its root directory:

```sh
./build.sh
```

The build needs a POSIX shell and standard file utilities. It copies the source,
vendored runtime and bundled assets into `dist/chrome/` and `dist/firefox/`.
There is no npm install, bundler, server, account or API key to configure.

### Chrome

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this checkout's `dist/chrome/` directory.
3. Pin Butu from the Extensions menu for easy access to the popup.
4. Reload any web pages that were already open before installation.

After changing source files, run `./build.sh` again, click **Reload** on Butu's
extension card, and reload your test pages.

### Firefox

1. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**.
2. Select this checkout's `dist/firefox/manifest.json`.
3. Open Butu from the Extensions menu; pin it to the toolbar if desired.
4. Reload any web pages that were already open before installation.

This is a temporary development installation: Firefox removes it when the
browser restarts. Load it again for the next run. After changing source files,
rebuild, click **Reload** in Butu's debugging entry, and reload test pages.
Store publishing and a signed Firefox package are outside the current scope.

## Spend a session together

Open Butu's popup, describe your task in 3–200 characters, choose 25, 45, 60 or
custom minutes, and press **Let's do it together!** Closing the popup keeps the
session running; reopen it to see the countdown or stop early.

The first page that needs semantic detection triggers a Hugging Face model
download. The popup shows **Butu is waking up…** and download progress per file.
Keep an internet connection until it finishes. The q8 weights are about 17.5 MB,
plus tokenizer/configuration files. Files are cached for later offline use;
clearing the browser's extension cache can require another download. If loading
fails, reconnect, stop the session and start again.

Off-task time accumulates per tab only while that tab is visible and its window
has focus:

| Foreground off-task time | What happens |
| --- | --- |
| Under 15 seconds | Grace period; no effects or sound |
| 15 seconds | Friendly margin doodles; music box fades in |
| 45 seconds | A few headings change; slower music and a whisper |
| 90 seconds | Overdrawn doodles, scribbles and drained colour; detuned music |
| 180 seconds | Frantic scribbles and a task-naming line; music winds down |

Return to an on-task tab to restore the haunted pages with a roughly two-second
fade and a happy chime. Sixty continuous foreground on-task seconds reset the
off-task timers. Stopping or reaching the session deadline also clears effects
and audio and releases the embedding worker.

At the end, the popup shows a summary. **Open our diary** opens local session
pages and **Places you left me for**, plus settings for domain overrides, volume,
mute and **test Butu's voice**. The diary retains the last 50 sessions. Domain
lists accept one hostname per line and include subdomains; allowlist wins if a
domain matches both lists.

## Bundled sound — elevenlabs.io

**Voice and sound effects generated with ElevenLabs —
[elevenlabs.io](https://elevenlabs.io).**

Sessions play 15 supplied custom Butu recordings, four versions of the original
local music-box composition, and bundled crayon/chime effects. Everything plays
from the Firefox background page or Chrome offscreen document. No key is needed,
no runtime synthesis occurs, and playback submits zero TTS characters. Speech is
generic; it does not speak your task aloud. Personalised TTS and runtime budget
controls are deferred.

The supplied recordings were confirmed by the user as their custom voice,
generated on the Free plan. Their exact voice ID, model and original billed
usage remain unknown. Sarah, Matilda and Lily previews are separate build-time
evidence and are not substituted into custom-voice sessions. The music box was
composed and synthesized locally, without the ElevenLabs Music API.

## Privacy and permissions

Task text, extracted page text, page URLs, verdicts, distracting domains, session
stats and diary data stay on the device. Page extraction uses the title, meta
description and about 500 characters of visible main text. Inference runs locally
on CPU in a dedicated, lazily loaded worker. Visible copy comes from bundled
templates with bounded local task/heading interpolation. No generative model is
loaded during normal use.

The only permitted extension runtime network activity is downloading model files
from Hugging Face (`huggingface.co` and its `*.hf.co` delivery hosts), normally on
first use. Those requests expose ordinary connection metadata, such as your IP
address and the requested model, to the download host; they contain no task or
browsing text. Fonts, images, audio, JavaScript and WebAssembly are bundled.
There are no runtime ElevenLabs calls, analytics, cloud inference or sync.
This describes Butu's traffic; websites you visit still make their own requests.

HTTP(S) site access lets Butu read the page sample and apply reversible effects
across sites. `storage` holds session state, settings and local history; `alarms`
handles session deadlines. Chrome also uses `offscreen` for model hosting and
audio. Extension pages, browser internal pages and new tabs are never haunted;
editable elements and pages with a focused form field are protected.

The manifests still contain a legacy `api.elevenlabs.io` CSP allowance; it is not
an active runtime feature. The full two-browser network audit (task 4.9) and final
acceptance run (4.10) are pending. See [the plan](docs/PLAN.md).

## Limitations

- Semantic similarity can misclassify pages. The current threshold was tuned on
  20 pages for one sample task: 10/10 relevant and 6/10 unrelated were classified
  correctly. Use domain overrides for mistakes; see [threshold notes](docs/threshold-notes.md).
- Page sampling and session URL caching can miss context or changing page content.
  Browser-protected pages cannot be inspected, and Butu cannot follow you into
  other apps, phones or browsers where it is not installed.
- The model worker is released after five idle seconds or session end. Browser
  process overhead varies; the 500 MB memory target is not a universal guarantee.
  Some measured Chrome process totals exceeded it; [measurements](docs/MODEL-LIFECYCLE.md)
  distinguish process RSS from whole-browser memory.
- Audio may be blocked by browser playback policy and then fails silently.
  Reduced-motion preferences use static doodles and fades.
- ElevenLabs Free-plan recordings have noncommercial terms. The bundled package
  is not an unrestricted commercial-use asset collection.

## Credits and licences

There is currently **no project-wide source-code licence** in this repository.
The component licences and asset dedications below apply to their respective
files; they do not grant a licence to all Butu source code or override audio terms.

| Component | Credit and licence | Records / full terms |
| --- | --- | --- |
| Transformers.js 3.8.1 | Hugging Face and contributors; Apache-2.0 | [Licence](vendor/LICENSE-transformers.txt), [pinned provenance](vendor/README.md) |
| ONNX Runtime Web 1.22.0-dev.20250409-89f8206ba4, including WASM and JS glue | Microsoft and contributors; MIT, with third-party notices | [Licence](vendor/LICENSE-onnxruntime.txt), [third-party notices](vendor/ThirdPartyNotices-onnxruntime.txt) |
| Active embedding model: paraphrase-MiniLM-L3-v2 | Sentence Transformers contributors; Apache-2.0 upstream model, ONNX conversion by Xenova | [Original model card and licence](https://huggingface.co/sentence-transformers/paraphrase-MiniLM-L3-v2), [ONNX model card](https://huggingface.co/Xenova/paraphrase-MiniLM-L3-v2) |
| Patrick Hand Regular | © 2010–2012 Patrick Wagesreiter; SIL Open Font License 1.1 | [OFL text](assets/fonts/patrick-hand/OFL.txt), [font sources and hashes](assets/fonts/README.md) |
| Gaegu Regular | © 2018 The Gaegu Project Authors; SIL Open Font License 1.1 | [OFL text](assets/fonts/gaegu/OFL.txt), [font sources and hashes](assets/fonts/README.md) |
| 16 crayon SVG doodles and bear variants | Original Butu project artwork authored with Codex; CC0-1.0 | [Inventory and credits](assets/doodles/README.md), [dedication](assets/doodles/LICENSE) |
| Popup teddy and paper texture | Original Butu project SVG artwork; CC0-1.0 | [Popup credits](src/popup/README.md), [paper credits](src/shared/README.md) |
| “A Place Beside Me”, all four music-box recordings | Butu project, original score and additive synthesis; CC0-1.0 | [Credits](assets/audio/music-box/README.md), [manifest](assets/audio/music-box/manifest.json) |
| Local `*-fallback.mp3` crayon/chime effects | Butu project, original noise/additive synthesis; CC0-1.0 | [Credits](assets/audio/sfx/README.md), [manifest](assets/audio/sfx/manifest.json) |
| `test-chime.mp3` playback probe | Butu project, original synthesized notes; CC0-1.0 | [Credits](assets/audio/README.md) |
| `butu-01.mp3`–`butu-15.mp3` | User-supplied custom voice exports; ElevenLabs Free-plan noncommercial output, attribution required | [Credits](assets/audio/voice/README.md), [scripts, hashes and source gaps](assets/audio/voice/manifest.json) |
| `crayon-scribbling.mp3`, `happy-return-chime.mp3` | ElevenLabs Sound Effects API, Free plan; noncommercial, attribution required | [Credits](assets/audio/sfx/README.md), [prompts and usage](assets/audio/sfx/manifest.json) |
| Sarah / Matilda / Lily preview MP3s in `docs/voice-previews/` | ElevenLabs standard TTS, Free plan; noncommercial, attribution required; not bundled by the build | [Credits and usage](docs/voice-design.md), [manifest](docs/voice-previews/manifest.json) |

Model weights are downloaded, not included in the repository. The active q8
ONNX model is pinned to revision `f2d931077e6527467d9ffc873f647d835e589e82`
in [config](src/config.js). Sentence-BERT credit: Nils Reimers and Iryna Gurevych,
[“Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks” (2019)](https://arxiv.org/abs/1908.10084).
Archived SmolLM2, FLAN-T5 and MiniLM-L6 experiments are opt-in tooling, never
normal session models; their sources and credits are in the
[Phase 0 report](experiments/phase0/README.md) and [model comparison](experiments/phase0/MODELS.md).

CC0 assets use the [CC0 1.0 Universal dedication](https://creativecommons.org/publicdomain/zero/1.0/).
Preserve bundled font licences, runtime licences and third-party notices when
redistributing their components. Original artwork uses no stock images or remote
assets. FFmpeg/libmp3lame were build-time encoders, not bundled runtime software.

ElevenLabs-generated speech, SFX and previews are **not CC0**. Under the
[ElevenLabs publication rules](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform),
Free-plan output is noncommercial and requires `elevenlabs.io` or `11.ai` in the
title when published, including demo audio/video. Keep those credits and the
recorded provenance with the files. [Audio documentation](docs/voice-design.md)
separately records 435 TTS preview characters/credits and 50 provider-reported
SFX credits (200 conservatively reserved). Original custom-pack usage is unknown;
these build-time records are not runtime usage or a current account balance.

## Development and manual checks

Run the existing unit suite with Node.js, then build both outputs:

```sh
node --test tests/*.test.js
./build.sh
```

Some audio checks also use locally installed FFmpeg/FFprobe. Optional audio
generation scripts under `scripts/audio/` are build-time tools; API generation
uses `ELEVENLABS_API_KEY` from the environment, free-profile quota guards and
separate usage records. They are unnecessary for installation or playback.
Never commit a key; `.env` is ignored.

### Chrome manual smoke check

1. Build and load `dist/chrome/` using the Chrome steps above. Reload test tabs.
2. Open the popup, enter a task and start a custom five-minute session. On an
   ordinary article, let the first model download finish; close/reopen the popup
   and check the countdown persists.
3. Open **Open our diary** → settings. Save `example.com` to the blocklist and
   `example.org` to the allowlist. Leave volume audible and mute off; press
   **test Butu's voice** and hear a bundled clip without supplying a key.
4. Focus `https://example.com/` for three minutes without a focused form field.
   Check each stage at 15/45/90/180 seconds, including sound. Switch to
   `https://example.org/`; check the haunted page restores after the return fade
   and the music stops.
5. Stop via the popup. Check the summary and diary entry, then disconnect and
   reopen the popup/diary and test the voice: fonts, drawings and audio still work.
   Reconnect and remove the two test domain overrides.

### Firefox manual smoke check

1. Build and load `dist/firefox/manifest.json` using the Firefox steps above.
   Reload test tabs; open the popup and start a custom five-minute session.
2. On an ordinary article, let the first model download finish; close/reopen
   the popup and check its countdown persists.
3. Open **Open our diary** → settings. Save `example.com` to the blocklist and
   `example.org` to the allowlist. With volume audible and mute off, press
   **test Butu's voice** and hear a bundled clip without supplying a key.
4. Focus `https://example.com/` for three minutes without a focused form field.
   Check stages and sound at 15/45/90/180 seconds. Switch to
   `https://example.org/`; verify restoration after the fade and stopped music.
5. Stop via the popup; check summary and diary entry. Use **File → Work Offline**
   (Alt reveals the menu bar), reopen popup/diary and test the voice. Confirm
   local fonts, drawings and sound. Turn Work Offline off and remove test overrides.

Installed-browser release checks, results and measurement scope: [network audit](docs/NETWORK-AUDIT.md)
and [Definition of done](docs/FINAL-CHECKS.md). Detailed component evidence: [diary](docs/DIARY.md),
[voice playback](docs/VOICE-PLAYBACK.md), [model lifecycle](docs/MODEL-LIFECYCLE.md).
Product requirements and settled choices: [spec](docs/SPEC.md),
[decisions](docs/DECISIONS.md), [task list](docs/PLAN.md).
