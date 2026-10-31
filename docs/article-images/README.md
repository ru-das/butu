# Week 4 article images

Real screenshots of the installed Butu extension, captured in an isolated Chrome
153 profile. The session used `DBMS assignment on normalization`. The Minecraft
Wikipedia article was explicitly blocklisted to make the visual demonstration
predictable. These pictures demonstrate the effects, not model classification.
All four stages used the actual 15/45/90/180-second foreground timers.

[Article copy with image-placement comments](article.md). The same HTML comments
are saved in the existing DEV article; they are editing notes, not visible prose.
Each comment contains the file, placement, alt text and suggested caption.

| File | Where it belongs |
| --- | --- |
| [01-start-session.png](01-start-session.png) | After introducing Butu and the start button |
| [02-before.png](02-before.png) | Optional comparison with the restored page |
| [03-stage-1.png](03-stage-1.png) | After the first cheerful drawings |
| [04-stage-2.png](04-stage-2.png) | After “Our work is still waiting” |
| [05-stage-3.png](05-stage-3.png) | After “It gets very quiet when you leave” |
| [06-stage-4.png](06-stage-4.png) | After “Your chair is still here”; strongest full-width shot |
| [07-restored.png](07-restored.png) | After the return-to-work paragraph |
| [08-session-summary.png](08-session-summary.png) | Optional alternative alongside the diary |
| [09-diary.png](09-diary.png) | End of the scrapbook section |
| [10-voice-settings.png](10-voice-settings.png) | Optional illustration at the end of the voice section |

The diary and summary contain the actual session from this capture, not invented
history or seeded statistics. Popup screenshots show the real extension popup
document opened as a tab at its normal 360 CSS-pixel width. Page screenshots
share the same viewport and scroll position. Capture timestamps and conditions
are in [capture.json](capture.json).

## ElevenLabs screenshots to supply

The local capture has no access to the signed-in ElevenLabs account. No provider
dashboard, voice-selection screen or billing screen has been recreated.

1. **11-elevenlabs-butu-voice.png**: Open the actual ElevenLabs Text to Speech
   screen. Select the custom Butu voice. Show an existing export such as
   `Your chair is still here.` with the generated audio/playback result visible.
   Keep the service branding, voice selector and sentence in frame. Hide email,
   account identifiers and secrets. Use existing history rather than spending
   credits to generate again for the screenshot. The article has a comment for
   this image immediately after the voice-creation paragraph.
2. **12-elevenlabs-sfx.png**, optional: Show the actual existing crayon or return
   chime generation, with its prompt and playable result. The music box was
   composed locally and must not be attributed to ElevenLabs generation.

Once uploaded through the DEV editor, replace each HTML comment with its image
and caption. Local filenames are references for the editor, not public URLs.
The draft remains unpublished.

## Reproduce manually in Chrome

1. Run `./build.sh`. Load `dist/chrome/` at `chrome://extensions` using Developer
   mode and Load unpacked. Use a fresh test profile; reload existing test tabs.
2. In diary settings save `en.wikipedia.org` as always off task and `example.org`
   as always on task. Keep sound on. Fill the task above; capture the start form.
3. Open <https://en.wikipedia.org/wiki/Minecraft>, capture its original view,
   start a 25-minute session, then focus the Minecraft tab without a form field
   focused. Capture at 15, 45, 90 and 180 foreground seconds, keeping the same
   viewport and scroll position.
4. Open <https://example.org/> to trigger the return. After the two-second fade,
   capture the restored Minecraft tab. Stop through the popup and capture its
   summary, the actual diary entry, and the voice settings page.
5. Confirm the original heading is restored, no overlay remains, playback ends,
   and the diary retains the captured session. Remove test overrides afterward.

## Reproduce manually in Firefox

1. Run `./build.sh`. Use `about:debugging` → This Firefox → Load Temporary Add-on
   → `dist/firefox/manifest.json` in a fresh test profile. Reload existing tabs.
2. Save the same two diary domain overrides and task, with sound on. Capture the
   popup and original Minecraft page.
3. Start the session, focus the Minecraft tab, and capture the four stages at the
   real 15/45/90/180 foreground-second thresholds without changing the framing.
4. Visit the always-on-task example.org tab; wait for the fade and capture the
   restored Minecraft page. Stop, then capture the summary, diary and settings.
5. Verify restored heading, removed effects, silence and saved diary entry;
   remove overrides. Firefox screenshots are an optional matching set, not
   represented as part of the Chrome files supplied here.

## Credits

Butu's original drawings and paper texture are CC0; Patrick Hand and Gaegu use
the SIL Open Font License. Their source credits remain in the repository.
Wikipedia page screenshots include text by Wikipedia contributors, available
under CC BY-SA 4.0: <https://en.wikipedia.org/wiki/Minecraft> and its linked page
history. Minecraft logos/artwork and Wikipedia marks retain their respective
owners' rights; the screenshots are documentation of an extension acting on a
third-party webpage, not newly licensed standalone artwork.

Bundled voice and generated effects: ElevenLabs Free-plan output, noncommercial
with attribution to [elevenlabs.io](https://elevenlabs.io). The screenshots
themselves contain no audio. Keep the existing attribution when adding the demo.
