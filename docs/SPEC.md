# Butu — Product Spec

## One-liner
Butu is a sweet little hand-drawn teddy bear who keeps you company while you work.
If you wander off to another page, Butu gets lonely, and the page slowly goes wrong.
Powered by an open embedding model running entirely inside your browser.

## Context
Submission for the DEV Hacktoberfest Open-Source AI Challenge, Week 4
("Ghost in the Machine"). Deadline: Oct 31, 11:59 PM PDT (Nov 1, 12:29 PM IST).
Judged mainly on the write-up, then theme relevance, creativity, execution.

Primary prize target: Best Use of ElevenLabs. Other partner categories are optional.

## Concept
Innocence turned eerie. Everything starts pure, pastel and childlike: crayon
doodles, handwriting, a friendly teddy bear. The horror is the slow corruption of that
innocence, never gore, never jump scares. Butu isn't evil. Butu is lonely, and you
promised.

## Target user
Someone working or studying in the browser who drifts absent-mindedly
("just one tab"), not someone determined to defeat the tool.

## Platforms
Chrome and Firefox desktop, Manifest V3, from one codebase. No server, no accounts.

## User flow
1. **Install.** First session triggers a one-time model download with a doodled
   progress indicator ("Butu is waking up…"). Cached afterwards.
2. **Start.** Popup: Butu waves. "Hi! What are we working on today?" text field,
   duration (25 / 45 / 60 / custom minutes), button "Let's do it together!".
   Toolbar badge shows remaining minutes. If an ElevenLabs key is set,
   personalised voice lines are prepared in the background.
3. **Work.** On-task pages are never touched. Silence.
4. **Drift.** Off-task page escalates through the corruption stages, visually and audibly.
5. **Return.** Switching to an on-task tab pauses the off-task timer; doodles and
   sound fade out over ~2 s, a soft happy chime plays, and the original page is
   fully restored.
6. **End.** Timer ends (or user stops early) → short summary in popup with a link
   "Open our diary" → models released, audio cache cleared → no haunting until
   the next session.

## Features

### F1. Focus session
- Task text (required, 3–200 chars), duration, start/stop.
- Session state in chrome.storage.local (survives popup closing and background restarts).
- Countdown computed from stored end time, not from ticking.
- Only one session at a time per browser.

### F2. On-task detection
- Input per page: title + meta description + first ~500 chars of visible main text.
- Embed page text and task text with the embedding model; cosine similarity.
- similarity ≥ ON_TASK_THRESHOLD (config) → on task.
- Allowlist (always on task) and blocklist (always off task) of domains,
  editable in the diary's settings page. Both checked before the model.
- Verdict cached per URL for the session.
- Never evaluated: browser internal pages, extension pages (including the diary),
  new tab page.

### F3. Off-task timing
- Off-task seconds count only while the off-task tab is visible AND its window is focused.
- Timer is per tab and resets after the user spends 60+ s on on-task pages.

### F4. Corruption stages
| Stage | Off-task time | Visual | Sound |
|---|---|---|---|
| 0 | 0–15 s | Nothing (grace period) | Silence |
| 1 | 15 s | A few cheerful crayon doodles appear in the margins (stars, smiley, tiny Butu) | Music box lullaby fades in, in tune |
| 2 | 45 s | 1–2 real headings rewritten in childlike handwriting, sing-song taunts about the task | Music box slightly slower + first whisper |
| 3 | 90 s | Doodles go wrong: smiley stops smiling, crayon scribbles creep over paragraphs, colours drain | Music box slow and detuned + second whisper |
| 4 | 180 s | Page covered in frantic scribble; one handwritten line in the centre naming the task | Music box winds down and stops + final line |

Timings live in config.js. All effects are reversible and fade out on return.
Doodles are bundled SVGs; no image generation at runtime.

### F5. Possession text (on-page)
- Tone: childlike, sing-song, sweet on the surface and wrong underneath.
  Examples: "You said we'd do the DBMS assignment together…",
  "Let's play a game! The game is the DBMS assignment.",
  "Why did you leave me alone with the DBMS assignment?"
- Select an authored template per page at stage 2 and cache that choice.
- Fill {task} and {heading} locally with bounded plain-text values; missing values
  have safe defaults. Insert with textContent. No runtime text-generation model.
- Stage-4 messages and diary captions use the same template interpolation.
- Semantic detection still uses the required open-weight embedding model.

### F6. Session summary (popup)
At session end the popup shows: time spent, times you wandered, minutes Butu
waited alone, one line from Butu, and a link "Open our diary".

### F7. Butu's Voice (ElevenLabs): core feature, primary prize target
Three layers, each working without the next:

1. **Ambient sound (always on unless muted).** Generated at build time and bundled:
   - A short music box lullaby (ElevenLabs Music), plus versions that are slower,
     detuned, and winding down, used for stages 1–4.
   - Sound effects (ElevenLabs Sound Effects): crayon scribbling, a soft giggle-free
     "hm?", a happy chime for returning to work.
2. **Base whisper pack (no key needed).** 15–20 generic Butu lines voiced at build
   time in Butu's voice, bundled as audio.
3. **Personalised voice (opt-in, user's own ElevenLabs key).** At session start,
   fill 4–5 voice-line templates with the task text locally, send ONLY those lines
   to ElevenLabs TTS in Butu's voice, cache the audio for the session, and play
   them at stages 2–4. Falls back to layer 2 on any error or without a key.

Butu's voice is created with the ElevenLabs Voice Design API from a written
description: soft, sing-song, too sweet, gentle like a nursery-rhyme narrator.
Check ElevenLabs' terms before designing anything childlike; an overly gentle adult
voice is the default. Prompt, previews and chosen voice ID are documented in
docs/voice-design.md.

Playback rules:
- Audio plays from the model host (Firefox background page / Chrome offscreen
  document), never from content scripts.
- Volume slider and mute toggle. Default volume low.
- Crossfade between stages; nothing overlaps harshly.
- Each whisper plays at most once per page visit.
- Fail silently if playback is blocked.
- Log ElevenLabs characters used per session so real costs can be reported.

### F8. Our Diary (local dashboard page)
An extension page (diary.html) opened in a normal tab via the popup link.
Loads entirely from the extension; no network. Styled as a child's scrapbook.
- **Diary pages:** one per session with date, task, time spent, times wandered,
  and a Butu drawing chosen by how the session went (happy → uneasy → wrong).
- **"Places you left me for":** distracting domains, in handwriting.
- **Settings page:** allowlist/blocklist, ElevenLabs key, volume, mute,
  "test Butu's voice" button.
- Stores the last 50 sessions in chrome.storage.local. Never transmitted.
- Stretch: sticker collection, one sticker per completed focused session.

## AI stack
| Role | Model / service | Runs | Approx. size |
|---|---|---|---|
| On-task detection | Xenova/paraphrase-MiniLM-L3-v2 (embeddings) | Local, in browser | ~17.5 MB, q8 |
| Possession text | Authored task/heading templates | Local, in browser | Bundled strings |
| Butu's voice design | ElevenLabs Voice Design | Build time | n/a |
| Music box lullaby | ElevenLabs Music | Build time, bundled | a few MB |
| Sound effects | ElevenLabs Sound Effects | Build time, bundled | a few MB |
| Base whispers | ElevenLabs TTS | Build time, bundled | a few MB |
| Personalised lines | ElevenLabs TTS | Session start, opt-in | cached in memory |

- Local runtime: Transformers.js, WebAssembly on CPU. No GPU required.
- Model host: Firefox background page; Chrome offscreen document.
- Only embeddings run in a dedicated worker; audio stays in the host document.
- Bound inference to 128 tokens, one string per model call, and one in-flight
  job. Cap pending jobs at four and score-cache entries at 64. Terminate the worker
  after five idle seconds or immediately at session end; clear session scores.
- Memory budget: under 500 MB peak during a session.

## Privacy boundary
- Never leaves the device: page content, URLs, browsing history, verdicts,
  session stats, diary.
- Leaves the device only if the user adds an ElevenLabs key: the user's own task
  text, inside 4–5 short voice lines, once per session, sent to api.elevenlabs.io.
- The key is stored in chrome.storage.local and used for nothing else.
- Model files are downloaded from Hugging Face once; no data is sent with them.
- Fonts and doodles are bundled; nothing loads from external CDNs.

## Visual and sound design
- **Calm state:** cream paper texture, pastel crayon colours, rounded handwriting
  font, wobbly hand-drawn borders, Butu as a small hand-drawn teddy bear with a friendly face.
- **Corruption:** the same visual language going wrong. Doodles lose their smiles,
  scribbles grow frantic, colours drain to grey and dull red.
- **Fonts:** open-licence handwriting fonts (e.g. Patrick Hand, Gaegu, Caveat),
  bundled locally.
- **Rule:** innocence first, wrongness slowly. No gore, no jump scares, no screaming.
  A music box going out of tune, not a scream.
- Respect prefers-reduced-motion: static doodles and fades only.

### Butu’s appearance through the stages

Butu remains recognisably the same hand-drawn teddy bear throughout. The
unsettling effect comes from familiar friendliness slowly going wrong, rather
than a transformation into a different creature. Use these character variants
alongside the page effects and timings in F4.

| State | When | Butu’s appearance |
|---|---|---|
| **Calm** | Popup greeting and normal companion artwork | Rounded ears, soft uneven outline, a little smile and relaxed paws. Warm pastel crayon strokes. No on-page Butu during the stage-0 grace period. |
| **Waiting** | Stage 1, after 15 s off task | The smile fades, the paws draw closer together, and the head tilts slightly as though listening for the user. |
| **Lonely** | Stage 2, after 45 s off task | The head droops, but the eyes keep facing the viewer. One ear sags. Repeated crayon strokes darken around the paws and seams. |
| **Something’s wrong** | Stage 3, after 90 s off task | The eyes become overdrawn patches. One corner of the mouth lifts awkwardly. The outline looks traced too many times, with strokes slightly out of alignment. |
| **Abandoned** | Stage 4, after 180 s off task | Butu sits very still amid frantic scribbles, paws held out toward the viewer. Most colour has drained away. A small, uneven smile returns. |

The final smile is the unsettling detail: Butu is trying to look happy so the
user will come back. No claws, sharp teeth, gore or monster transformation.
The sagging ear and darkened seams remain drawn marks, not graphic damage.

On return to work, the extra strokes fade, the posture relaxes and the original
smile returns as the haunting fades out over roughly two seconds. Restore the
page fully and remove the on-page character. Ending a session also clears the
haunting. These are bundled static SVG variants, with fades between states;
respect prefers-reduced-motion and do not add tracking eyes or sudden motion.

## Copy examples
- Popup greeting: "Hi! What are we working on today?"
- Start button: "Let's do it together!"
- First run: "Butu is waking up…"
- Return chime caption: "Yay, you're back!"
- Summary: "I waited 11 minutes. That's okay. I'm used to waiting."

## Partner technology (prize categories)
- **ElevenLabs (primary target):** Butu's voice via Voice Design, music box lullaby
  via Music, sound effects, base whisper pack, opt-in personalised lines, demo narration.
- Optional, only if time allows:
  - **.tech domain:** landing page (site/) with demo video and install steps.
  - **Ultramarine:** build time only, drafts authored template variants;
    actual run cost reported. Never sees user data.
  - **Entire / GitHub Copilot:** depending on build tooling.

## Out of scope
Desktop app, mobile, accounts/sync, store publishing, cloud AI for detection or
text generation, blocking other apps, analytics of any kind.

## Known limitations (state openly in the write-up)
- Can't follow the user to other apps, their phone, or browsers without Butu.
- Semantic similarity can misclassify ambiguous pages; thresholds need real-page
  testing and users can override domains. Character copy comes from templates.
- The browser controls process overhead; the 500 MB target must be measured on
  supported browsers and cannot be guaranteed universally by extension code.
- Personalised voice needs the user's own ElevenLabs key; without it Butu uses
  bundled lines.
- Built for absent-minded drift, not adversarial users.

## Definition of done
- Session starts from popup, countdown visible, ends cleanly with a summary.
- Off-task page reaches all stages on schedule; returning fully restores it.
- On-task pages (including a relevant YouTube video) are never haunted.
- Each stage has its sound; personalised lines play with a valid key and fall
  back to the base pack without one.
- Diary page opens from the popup and shows past sessions and settings.
- Works in Firefox and Chrome from the same src/.
- Peak memory during a session under 500 MB on the 4 GB machine.
- Network audit shows only Hugging Face model downloads and, if keyed, one batch
  of ElevenLabs TTS calls at session start containing only task text.
