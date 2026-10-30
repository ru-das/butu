# Butu companion voice pack — elevenlabs.io

Fifteen user-provided ElevenLabs website exports received 2026-10-30.
Direction: an original sweet, childlike fictional teddy-bear companion.
The [manifest](manifest.json) records intended text/tagged input, durations,
format, byte sizes and SHA-256 hashes. The intended scripts come from the manual
instructions; they are not verified transcripts of the audio.

All 15 files pass FFprobe inspection and a full FFmpeg decode: MP3, mono,
44.1 kHz. Original files were preserved without editing or normalization.
Voice name/ID, model, generation plan and service-reported usage are not present
in the files and remain unconfirmed. Audio tags were recommended with Eleven v3;
this does not establish which model was actually used. No generation API call
was made to receive or inspect these assets.

These recordings are **not CC0** and do not inherit a source-code licence.
Apply ElevenLabs Free-plan noncommercial/attribution restrictions conservatively
until the generation plan is confirmed. Include `elevenlabs.io` or `11.ai` in
published audio/video titles under the current
[publication rules](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform).
The original test chime has separate CC0 credits in [../README.md](../README.md).

This is asset intake following the user's manual-generation workflow. It does
not complete playback integration: V2/V3 remain next in plan order, V4 still
needs its final pack/source check, and V5 wires stage playback. The configured
Sarah API voice is separate from this pack and has not been changed to an
unknown custom voice ID.

## Manual listening checks

Chrome:

1. Use Ctrl+O to open each `butu-01.mp3` through `butu-15.mp3` in Chrome.
2. Press Play on every file; compare against `intended_text` in the manifest.
3. Confirm bracketed tags are performed rather than spoken literally, words are
   complete, and the delivery remains gentle. Record any file needing replacement.
4. After `./build.sh`, check the files and manifest exist under
   `dist/chrome/assets/audio/voice/`. Automatic stage playback is not wired yet.

Firefox:

1. Use Ctrl+O to open the same 15 original MP3s in Firefox.
2. Press Play on each; confirm the full text and reactions match the same manifest.
3. Check for audible glitches, harsh peaks, or literal tag names; record replacements.
4. After `./build.sh`, check the files and manifest exist under
   `dist/firefox/assets/audio/voice/`. Automatic stage playback belongs to V5.
