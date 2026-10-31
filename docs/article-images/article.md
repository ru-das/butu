*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26).*

## What I Built

You open a tutorial for your assignment. Then another tab. Then a video that has absolutely nothing to do with the assignment.

Somewhere in the browser, a little teddy bear is still waiting for you.

**Butu is a focus companion for Chrome and Firefox.** You tell him what you're working on, choose a time, and press **“Let's do it together!”** A small open-weight model runs inside the browser to work out whether the page you're reading belongs to that task.

While you work, Butu leaves you alone.

<!-- IMAGE 01 — Place 01-start-session.png here. Show the real popup with the task filled in and “Let's do it together!” visible. Alt: Butu's handwritten session form with a waving teddy bear and a DBMS task. Caption: One task, a little time, and someone to sit beside you. -->

When you wander off, he starts drawing.

At first, it's sweet. A few crayon stars in the margins. A little music box. Nothing that couldn't belong in a child's scrapbook.

<!-- IMAGE 02 — Place 03-stage-1.png here. First haunting stage on the Minecraft article, with friendly margin doodles. Alt: A Minecraft page with small pastel crayon drawings at its edges. Caption: Fifteen seconds away. He starts drawing. -->

Stay away longer and the page starts to feel wrong. A heading has become:

> You said we'd finish DBMS assignment together…

The music is slower now. A small voice says:

> Our work is still waiting.

<!-- IMAGE 03 — Place 04-stage-2.png here. Keep the rewritten heading and little bear visible; use the same page and framing as the other stages. Alt: Butu replaces headings on the Minecraft page with a handwritten reminder. Caption: Forty-five seconds. The page remembers what you promised. -->

At ninety seconds, the drawings are scribbled over. The tune slips out of key. Butu whispers:

> It gets very quiet when you leave.

<!-- IMAGE 04 — Place 05-stage-3.png here. Show the overdrawn doodles and scribbles, with the underlying article still recognisable. Alt: Crayon scribbles spread across the Minecraft article as Butu's expression changes. Caption: Ninety seconds. The tune is slipping. -->

At three minutes, the music box winds down and stops. Frantic crayon fills the page. One last whisper:

> Your chair is still here.

<!-- IMAGE 05 — Place 06-stage-4.png here. This is the strongest full-width image and can also serve as the cover crop. Keep the central task line and abandoned bear visible. Alt: Frantic crayon covers the Minecraft page around a handwritten line naming the unfinished task. Caption: Three minutes. The music stops. He's still there. -->

Go back to your work and the page returns to normal. A happy little chime plays. The drawings disappear, the original headings come back, and Butu lets you get on with it.

That's the whole idea. You left someone waiting, and coming back makes things better.

<!-- IMAGE 06 — Place 07-restored.png here. Use 02-before.png as an optional matching before/after pair; keep the same crop. Alt: The same Minecraft article restored to its original heading and appearance, with no Butu overlay. Caption: Come back, and everything goes back to how it was. -->

### A scrapbook of the time you spent together

At the end of a session, **“Open our diary”** takes you to a handwritten scrapbook: your task, how long you spent away, how many times you wandered, and the **“Places you left me for.”**

Butu draws himself differently depending on how much of the session he spent waiting. A happy bear on a good day. An uneasy one after more wandering. Something a little wrong after a long absence.

One of the diary captions reads:

> I drew us both smiling. It's our diary. We can keep that version.

The diary stays on your device. So does the list of places you visited.

<!-- IMAGE 07 — Place 09-diary.png here. Show the saved page from the captured demonstration, including the drawing, task and “Places you left me for.” Alt: Butu's local scrapbook with the DBMS session, a teddy-bear drawing and the distracting domain. Caption: He kept a page for the time you spent together. -->

## Demo

**Try Butu with the sound on.** The music and whispers are half the haunting.

Build and load the extension using the steps in the repository. Then:

1. Start a session with **“DBMS assignment on normalization.”**
2. Open a database-normalization article or a relevant tutorial. Butu should leave it alone.
3. Open an unrelated page and keep its tab in focus. The stages begin at **15, 45, 90 and 180 seconds**.
4. Return to the work tab. Watch the haunted page restore and listen for the return chime.
5. Stop the session and open the diary.

For a predictable tour of the effects, the diary's settings let you mark one domain as always on task and another as always off task. You can also change the volume, mute everything, or test Butu's voice there.

## Code

{% github ru-das/butu %}

Plain JavaScript, HTML and CSS. One source tree for both browsers. No framework, bundler, local server or API key.

Run `./build.sh`, then load `dist/chrome/` through Chrome's **Load unpacked**, or `dist/firefox/manifest.json` through Firefox's **Load Temporary Add-on**. The README has the complete instructions.

## How I Built It

### A tutorial is work. A different video isn't.

A domain blocker can't make that distinction: both videos live on YouTube.

Butu uses **`Xenova/paraphrase-MiniLM-L3-v2`**, an open-weight embedding model running locally through Transformers.js. It compares your task with the page title, description and a short excerpt of visible text.

The quantized weights are about **17.5 MB**. They're downloaded once from Hugging Face and cached. After that, detection works offline. The model runs in a dedicated worker that is released when idle or when the session ends.

It isn't perfect. On the twenty pages used to tune the threshold for one DBMS task, it kept all ten relevant pages and caught six of the ten unrelated ones. Audio normalization fooled it: similar words, different subject. That's why domain overrides are part of the product.

But it did distinguish a useful database tutorial from an unrelated music video. You can do your assignment on YouTube without declaring the whole site forbidden.

### My laptop made me cut a model

I built this on a machine with **4 GB of RAM**. The original plan had a second model writing Butu's reminders.

The experiments made that a poor trade. SmolLM2 sometimes echoed the prompt or lost the task. FLAN-T5 gave a DBMS reminder this contribution:

> a teddy bear is a teddy bear

Fair. Not helpful.

I cut runtime text generation and wrote Butu's lines instead. The embedding model handles relevance; the character's words come from authored templates, filled with the task locally.

That also let me spend more care on the writing. Butu can sound hurt without becoming cruel. The teddy bear, the crayon and the sweetness stay recognisable even as everything goes wrong.

### Giving the bear a voice

The direction for Butu was a sweet, small, fictional teddy-bear companion. A voice that sounds pleased to sit beside you, then increasingly unsure whether you're coming back.

I created the custom voice through the ElevenLabs website and exported fifteen short lines. The delivery notes were as important as the sentences: gentle, hesitant, a sigh, a whisper. **“Your chair is still here”** needs very few words.

<!-- IMAGE 08 — ELEVENLABS WEBSITE SCREENSHOT NEEDED: capture the actual signed-in Text to Speech screen with the custom Butu voice selected, the line “Your chair is still here.” and its existing generated audio/playback result visible. Keep ElevenLabs branding in frame. Hide email, account identifiers and any key; do not generate again just for a screenshot. Save as 11-elevenlabs-butu-voice.png. Alt: The custom Butu voice selected in ElevenLabs with the final whisper and its generated audio. Caption: Giving the bear his last little whisper. -->

The extension bundles those recordings. Three of them carry the escalation: the gentle reminder, the lonely observation, the final whisper. They play once per page visit, so Butu doesn't repeat the same sentence over your shoulder.

ElevenLabs also generated the crayon-scribbling sound and the happy return chime. I composed the music box locally: one original melody in four states, from in tune to winding down. The transitions crossfade so the sound changes with the page.

<!-- OPTIONAL IMAGE — If available, add a second real ElevenLabs screenshot of the existing crayon or return-chime generation history with the prompt and audio result visible. Save as 12-elevenlabs-sfx.png. Keep branding; hide personal/account details. Caption: A crayon scratch and a little welcome home, generated with ElevenLabs. Do not imply the locally composed music box was generated there. -->

**Everything you hear during a session is bundled.** No live synthesis, no key to enter, no task text sent out to become speech. The written reminders can name your assignment; the recorded voice stays generic. It keeps working with the internet disconnected.

<!-- OPTIONAL IMAGE — Place 10-voice-settings.png here if the voice section needs one more visual. Show the real “test Butu's voice” button and ElevenLabs attribution. Alt: Butu settings with volume, mute, a bundled voice-test button and ElevenLabs credits. Caption: His voice comes with him. No key to enter. This is extension-side integration evidence, not a screenshot of the ElevenLabs website. -->

### The haunting has to undo itself

The extension changes real pages, so restoration mattered from the beginning.

It saves the originals before changing headings, avoids editable fields, and pauses the haunting while a form field is focused. Hidden tabs don't accumulate off-task time. Reduced-motion preferences keep the drawings static.

The recorded Chrome and Firefox runs walked through all four stages at their real timings, then checked the restored document and its original heading nodes. They also covered the return audio, session expiry and diary. Butu can make a page look abandoned; he shouldn't damage the work sitting inside it.

## Why Does Open Innovation Matter?

A tool that checks what you're reading needs a reason to be trusted.

For Butu, that starts with **keeping the checking inside the browser**. Your task, page excerpts, URLs and diary never go to a hosted inference service. The network audit in both browsers found only the model-file downloads on the exercised extension paths; cached detection and bundled sound worked with external connectivity blocked.

Open weights make that possible without asking someone to install a separate AI server. The model lives where the interaction happens, and there is no bill for checking another tab.

They also made experimentation affordable. I could compare the small models on my own hardware, keep the useful one and remove the one that made the experience worse.

ElevenLabs supplies the character voice and generated effects; the music and visual assets are local. That boundary lets Butu have a carefully voiced personality without sending someone's browsing context to a voice service.

## The Spirit of It

For **Ghost in the Machine**, I wanted the familiar thing to become unsettling.

The teddy bear stays a teddy bear. The crayons stay pastel. The voice stays soft. What changes is how long he's been waiting.

The music box eventually gives up.

Butu doesn't.

## Prize Categories

**Best Use of ElevenLabs** — the custom companion voice and generated crayon/return effects are part of the haunting itself: a gentle reminder, a lonely whisper, and a welcome back. Stage-driven playback, music transitions and bundled recordings keep that presence available offline.

---

*Voice and sound effects generated with ElevenLabs — [elevenlabs.io](https://elevenlabs.io). Free-plan audio is for noncommercial use, with attribution. The music-box composition is original and locally rendered.*

*Built and written with AI assistance.*

