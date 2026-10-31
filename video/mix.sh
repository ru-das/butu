#!/bin/sh
# Builds out/bed.wav: music box + Butu's voice + crayon and chime, in real video time.
# Stage 2 is skipped. Stage 3 plays bars 1-5 from 14 s. Stage 4 runs 28-42.6 s and is the climax:
# its 2 s rest is cut out, levelled so fading notes stay audible, doubled an octave down, long echoes, then cut dead.
# Two voice lines are slowed and echoed underneath it. No network, no API calls.
set -e
A=../assets/audio; M=$A/music-box; V=$A/voice; S=$A/sfx
fmt=aresample=48000,aformat=channel_layouts=stereo
slow="aresample=48000,asetrate=34000,aresample=48000,aecho=0.8:0.8:300|700:0.5|0.3,aformat=channel_layouts=stereo"
ffmpeg -v error -y \
  -i $M/stage-1-in-tune.mp3 -i $M/stage-3-detuned.mp3 -i $M/stage-4-winding-down.mp3 \
  -i $V/butu-01.mp3 -i $V/butu-02.mp3 -i $V/butu-05.mp3 -i $V/butu-06.mp3 -i $V/butu-07.mp3 -i $V/butu-08.mp3 -i $V/butu-12.mp3 -i $V/butu-14.mp3 \
  -i $V/butu-11.mp3 -i $V/butu-09.mp3 \
  -i $S/crayon-scribbling.mp3 -i $S/happy-return-chime.mp3 -filter_complex "
  [0]asplit[a0][a1];
  [a0]atrim=0:14.2,afade=out:st=13.6:d=0.6,$fmt[m1];
  [1]atrim=0.1:14.6,asetpts=N/SR/TB,afade=out:st=14:d=0.5,$fmt,adelay=14000:all=1[m3];
  [2]asplit[p1][p2];
  [p1]atrim=10.52:14.49,asetpts=N/SR/TB[p1t]; [p2]atrim=16.65:27.28,asetpts=N/SR/TB[p2t];
  [p1t][p2t]concat=n=2:v=0:a=1,dynaudnorm=f=150:g=7:m=30:p=0.9,$fmt,asplit[h1][h2];
  [h2]asetrate=24000,aresample=48000,atempo=2,volume=0.9[low];
  [h1][low]amix=2:normalize=0,aecho=0.8:0.75:450|1100|1900:0.5|0.35|0.2,volume=0.8,apad=whole_dur=14.6,atrim=0:14.6,afade=out:st=14.45:d=0.15,adelay=28000:all=1[m4];
  [a1]atrim=0:14,afade=in:d=1.2,afade=out:st=12.6:d=1.4,$fmt,adelay=47700:all=1[m5];
  [m1][m3][m5]amix=3:normalize=0,volume=1.3[calm];
  [3]$fmt,adelay=400:all=1[v1]; [4]$fmt,adelay=4300:all=1[v2]; [5]$fmt,adelay=8000:all=1[v3];
  [6]$fmt,adelay=15500:all=1[v4]; [7]$fmt,adelay=20400:all=1[v5]; [8]$fmt,adelay=23600:all=1[v6];
  [9]$fmt,volume=2,adelay=44000:all=1[v7]; [10]$fmt,adelay=48400:all=1[v8];
  [v1][v2][v3][v4][v5][v6][v7][v8]amix=8:normalize=0,apad=whole_dur=63,asplit[voice][key];
  [calm][key]sidechaincompress=threshold=0.02:ratio=5:attack=20:release=350[ducked];
  [11]$slow,volume=0.55,adelay=33000:all=1[w1]; [12]$slow,volume=0.55,adelay=38000:all=1[w2];
  [13]asplit=4[c1][c2][c3][c4];
  [c1]$fmt,volume=0.7,adelay=10200:all=1[s1]; [c2]$fmt,volume=0.5,adelay=14600:all=1[s2]; [c3]$fmt,volume=0.5,adelay=20800:all=1[s3]; [c4]$fmt,volume=0.4,adelay=28200:all=1[s5];
  [14]$fmt,volume=0.9,adelay=46600:all=1[s4];
  [ducked][voice][m4][w1][w2][s1][s2][s3][s5][s4]amix=10:normalize=0,apad=whole_dur=63[out]" -map "[out]" -t 63 out/bed.wav
