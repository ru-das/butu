# Phase 0 test audio

`test-chime.mp3`: original Butu project test signal, dedicated to the public
domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
Three synthesized sine notes (C5, E5, G5), 1.7 seconds, mono MP3 at 64 kbps.
No samples, external recording, voice service or API characters used.
This is a playback probe, not the final ElevenLabs sound pack.

Regenerate with the locally installed FFmpeg using `sh scripts/audio/test-chime.sh`.
FFmpeg is build-time tooling only; the extension needs no encoder or new dependency.
