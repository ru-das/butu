# Phase 0 test audio

`test-chime.mp3`: original Butu project test signal, dedicated to the public
domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
Three synthesized sine notes (C5, E5, G5), 1.7 seconds, mono MP3 at 64 kbps.
No samples, external recording, voice service or API characters used.
This is a playback probe, not the final voice/sound pack. The free-profile
revision uses a locally composed music box; standard ElevenLabs TTS and optional
free-quota SFX have separate noncommercial/attribution terms, not this CC0 licence.
The V1 previews live in `docs/voice-previews/`; their credit/terms and full audit
are in [voice-design.md](../../docs/voice-design.md). User-provided companion
speech clips are now in [voice/](voice/README.md), with their own manifest and
separate ElevenLabs terms. The original V2 music box is bundled in
[music-box/](music-box/README.md). V3's [sound effects](sfx/README.md) include
ElevenLabs outputs and original local fallbacks with separate terms;
the 15-clip custom voice pack is user-approved, with Free-plan provenance and
an offline validator. V5 playback wiring remains pending.

Regenerate with the locally installed FFmpeg using `sh scripts/audio/test-chime.sh`.
FFmpeg is build-time tooling only; the extension needs no encoder or new dependency.
