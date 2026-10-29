# Butu — agent instructions

Butu is a browser extension (Chrome + Firefox, Manifest V3) for focus sessions.
Butu is a sweet hand-drawn teddy bear who keeps you company while you work. When the user
drifts to an off-task page, Butu gets lonely and the page slowly goes wrong:
innocent crayon doodles and a music box that corrupt stage by stage.
All text AI runs locally in the browser.

- Product spec: docs/SPEC.md
- Task list: docs/PLAN.md (work strictly in order)
- Settled decisions: docs/DECISIONS.md (read before proposing any change of approach)

Primary prize target: Best Use of ElevenLabs. Butu's voice, the music box and the
sound design are core features, not extras. Other partner integrations are optional.

## Hard constraints
- Privacy: network requests are allowed only for
  (a) downloading model files from Hugging Face on first use, and
  (b) ElevenLabs TTS at session start, opt-in, sending ONLY the user's task text.
  Never send page content, URLs, browsing history, stats or diary data anywhere.
  The ElevenLabs key is stored in chrome.storage.local and sent only to api.elevenlabs.io.
- No external assets at runtime: fonts, doodles (SVG) and audio are bundled.
  No CDNs, no Google Fonts, no remote images.
- Stack: plain JavaScript (ES modules), HTML, CSS. No frameworks, no TypeScript,
  no bundler. Only runtime dependency: Transformers.js, vendored in vendor/.
- Memory: target machine has 4 GB RAM. The only runtime model is the embedding
  model, loaded lazily in one dedicated worker and released on idle/session end.
  Use authored templates for visible text; never load a generative model in the
  normal extension. Historical model benchmarks are explicitly opt-in tooling.
- Config: model IDs, dtypes, thresholds, stage timings and voice IDs live only in
  src/config.js.
- Cross-browser: one src/ for both browsers. Use `chrome.*` APIs. Browser-specific
  code is allowed only in src/model-host/ and the two manifests.
- Audio plays from the model host (Firefox background page / Chrome offscreen
  document), never from content scripts. Fail silently if playback is blocked.
- Reversibility: every DOM change must be undoable. Store originals before editing,
  restore them fully when haunting ends. Never touch inputs, textareas,
  contenteditable elements, or pages with focused form fields.
- Never haunt extension pages (popup, diary), browser internal pages or the new tab page.
- Model output is untrusted: always validate, always have a template fallback.
  Insert text with textContent, never innerHTML.
- Never commit API keys. Build-time scripts read ELEVENLABS_API_KEY from the
  environment; .env is gitignored.

## Tone and design rules
- Innocence first, wrongness slowly. Pastel, crayon, handwriting, a friendly Butu.
- Corruption = the same visual language going wrong. No gore, no jump scares,
  no screaming, no blood.
- Butu is lonely, not evil. Copy is sweet on the surface, unsettling underneath.
- Respect `prefers-reduced-motion`: static doodles and fades only.

## Layout

    manifests/chrome.json      Chrome manifest (service worker + offscreen)
    manifests/firefox.json     Firefox manifest (background scripts, gecko id)
    build.sh                   copies src/, vendor/, assets/ + right manifest into dist/<browser>/
    src/config.js              model IDs, dtypes, thresholds, stage timings, voice IDs
    src/background.js          session timer, tab tracking, verdict cache, message routing
    src/model-host/            model loading, inference, audio playback
                               (firefox: background page; chrome: offscreen doc)
    src/lib/                   pure functions (similarity, stage calc, validation), no browser APIs
    src/content/content.js     page text extraction + applying/removing corruption stages
    src/content/haunt.css      all on-page visual effects
    src/popup/                 greeting, task input, duration, start/stop, countdown,
                               session summary, "Open our diary" link
    src/diary/                 diary.html: session pages, places-you-left-me-for, settings
                               (allow/blocklist, ElevenLabs key, volume, mute, test voice)
    src/shared/                shared CSS (paper texture, fonts, colours) for popup + diary
    src/templates.js           authored taunts, voice-line templates, stage-4 lines, diary captions
    src/voice.js               session-start personalised TTS, audio cache, stage playback queue
    vendor/                    Transformers.js + ONNX Runtime WASM files
    scripts/audio/             build-time: voice design, music box, sound effects, base whisper pack
    assets/audio/              generated clips bundled with the extension
    assets/doodles/            hand-drawn style SVGs (calm and corrupted variants)
    assets/fonts/              open-licence handwriting fonts (with licence files)
    docs/voice-design.md       Butu's voice prompt, previews, chosen voice ID, audio prompts
    tests/                     node:test unit tests for src/lib/

## Commands
- Build: `./build.sh` → `dist/chrome/` and `dist/firefox/`
- Unit tests: `node --test tests/*.test.js`
- Firefox: about:debugging → This Firefox → Load Temporary Add-on → dist/firefox/manifest.json
- Chrome: chrome://extensions → Developer mode → Load unpacked → dist/chrome/
- Audio generation (build time only): scripts in scripts/audio/, need ELEVENLABS_API_KEY

## Working rules
- Do one task from docs/PLAN.md per request. Tick its box when done.
- Commit after every completed task.
- Small, focused changes. Don't refactor or reformat unrelated files.
- Pure logic goes in src/lib/ with a unit test.
- After each task, list exact manual test steps for BOTH browsers.
- If the spec is ambiguous or something seems impossible, stop and ask. Don't guess,
  and don't silently switch approach (see docs/DECISIONS.md).
- Don't add dependencies, permissions, or network hosts without asking.
- Include licence/credit info for every bundled font and asset.
- Log ElevenLabs characters used per session so real costs can be reported.
