# Butu sound effects

`crayon-scribbling.mp3` (3 seconds) and `happy-return-chime.mp3` (2 seconds)
were generated at build time with the ElevenLabs Sound Effects API, model
`eleven_text_to_sound_v2`, on the verified free account on 2026-10-30.

**Sound effects generated with ElevenLabs — [elevenlabs.io](https://elevenlabs.io).**
These two API outputs are noncommercial and require ElevenLabs attribution;
they are not covered by the fallback assets' CC0 dedication or a code licence.
See [ElevenLabs publication rules](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform).

The two `*-fallback.mp3` files are original Butu project deterministic noise/
additive synthesis, without recordings or external samples. They are dedicated
under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
Their source is `src/lib/sfx.js`. FFmpeg/libmp3lame encodes them locally.

All files are MP3, 44.1 kHz, 128 kbps. `manifest.json` records exact prompts,
source per file, hashes, quota observations, reservations and reported costs.
Playback integration belongs to V5; this task adds no runtime requests.

Regenerate offline without a key or quota:

```sh
scripts/audio/sfx generate /tmp/butu-sfx-offline --local
```

Use a new output directory. Omitting `--local` permits at most two short API
requests after free-quota checks; no automatic retry, overage or paid substitution.
Retain the supplied pack rather than spending credits to rerun verification.
Exact Chrome/Firefox listening checks: [voice-design.md](../../../docs/voice-design.md#v3-sound-effects).
