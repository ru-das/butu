#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i 'sine=frequency=523.25:duration=0.5:sample_rate=44100' \
    -f lavfi -i 'sine=frequency=659.25:duration=0.5:sample_rate=44100' \
    -f lavfi -i 'sine=frequency=783.99:duration=0.7:sample_rate=44100' \
    -filter_complex '[0:a]afade=t=out:st=0.1:d=0.4[a];[1:a]afade=t=out:st=0.1:d=0.4[b];[2:a]afade=t=out:st=0.1:d=0.6[c];[a][b][c]concat=n=3:v=0:a=1[out]' \
    -map '[out]' -codec:a libmp3lame -b:a 64k -map_metadata -1 -write_xing 0 \
    assets/audio/test-chime.mp3
