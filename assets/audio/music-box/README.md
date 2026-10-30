# A Place Beside Me

Original Butu project composition and synthesized recording, dedicated to the
public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
Credit: Butu project, “A Place Beside Me” (original score and additive synthesis).
No borrowed melody, samples, downloaded composition or ElevenLabs output.
The separate ElevenLabs speech-pack terms do not apply to these music files.

- `stage-1-in-tune.mp3`: original lullaby, 80 BPM.
- `stage-2-slower.mp3`: same score and tuning, 64 BPM.
- `stage-3-detuned.mp3`: 64 BPM with uneven tine tuning and subtle pitch wobble.
- `stage-4-winding-down.mp3`: progressively wider note spacing, falling pitch,
  weakening strikes, an unfinished phrase, ringing tail and a silent final second.

All files are mono MP3, 44.1 kHz, 128 kbps. `manifest.json` records exact source
durations, PCM sample peaks, hashes, encoder version and zero API usage.
The sources are `src/lib/music-box.js` and `scripts/audio/music-box`.

Generate into a **new** directory with Node and the locally installed FFmpeg:

```sh
scripts/audio/music-box generate /tmp/butu-music-box-review
```

Existing directories are refused. No key, network, npm package or runtime encoder
is required. See [voice-design.md](../../../docs/voice-design.md#v2-original-local-music-box)
for the score, transformations and exact checks in both browsers. Listening
review remains manual; runtime stage playback/crossfades are task V5.
