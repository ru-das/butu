// Original Butu lullaby, "A Place Beside Me": eight bars of 3/4 in C major.
// Build-time synthesis only; not imported by any extension entry point.
export const MUSIC_BOX_SAMPLE_RATE = 44100;
export const MUSIC_BOX_BARS = [
    [[76, 1], [79, 0.5], [76, 0.5], [72, 1]],
    [[74, 1], [76, 1], [79, 1]],
    [[81, 1.5], [79, 0.5], [76, 1]],
    [[74, 2], [71, 1]],
    [[76, 1], [79, 0.5], [84, 0.5], [83, 1]],
    [[81, 1], [79, 1], [76, 1]],
    [[77, 1], [76, 0.5], [74, 0.5], [71, 1]],
    [[74, 1], [72, 2]],
];
export const MUSIC_BOX_STAGES = [
    { stage: 1, name: 'in-tune', bpm: 80 },
    { stage: 2, name: 'slower', bpm: 64 },
    { stage: 3, name: 'detuned', bpm: 64 },
    { stage: 4, name: 'winding-down', bpm: 64 },
];

export function musicBoxNotes(stage) {
    const profile = MUSIC_BOX_STAGES.find(item => item.stage === stage);
    if (!profile) throw new RangeError('Music box stage must be 1–4.');
    const notes = [];
    let beat = 0;
    for (const [bar, melody] of MUSIC_BOX_BARS.entries()) {
        // A quiet lower tine under each bar: C5, G4, A4, G4, C5, A4, F4, C5.
        notes.push({ midi: [72, 67, 69, 67, 72, 69, 65, 72][bar], beat, gain: 0.045 });
        for (const [midi, beats] of melody) {
            notes.push({ midi: midi + 12, beat, gain: 0.14 });
            beat += beats;
        }
    }
    return notes.filter(note => stage !== 4 || note.beat < 16).map((note, index) => ({
        ...note,
        start: 0.1 + 60 / profile.bpm * (note.beat + (stage === 4 ? 0.055 * note.beat ** 2 : 0)),
        cents: stage >= 3 ? [0, -23, 17, -35, 29, -12, 8][index % 7] - (stage === 4 ? 32 * note.beat : 0) : 0,
    }));
}

export function renderMusicBox(stage) {
    const notes = musicBoxNotes(stage);
    const profile = MUSIC_BOX_STAGES[stage - 1];
    const duration = stage === 4 ? notes.at(-1).start + 4 : 0.1 + 24 * 60 / profile.bpm + 2;
    const samples = new Float32Array(Math.ceil(duration * MUSIC_BOX_SAMPLE_RATE));
    for (const note of notes) {
        const offset = Math.round(note.start * MUSIC_BOX_SAMPLE_RATE);
        const frequency = 440 * 2 ** ((note.midi - 69) / 12 + note.cents / 1200);
        let phase = 0;
        for (let i = 0; i < 3 * MUSIC_BOX_SAMPLE_RATE && offset + i < samples.length; i++) {
            const t = i / MUSIC_BOX_SAMPLE_RATE;
            // Integrate frequency so wobble is continuous, without phase jumps.
            const wobble = stage >= 3 ? 2 ** (9 * Math.sin(2 * Math.PI * 1.7 * t) / 1200) : 1;
            const droop = stage === 4 ? 2 ** (-45 * t / 1200) : 1;
            phase += 2 * Math.PI * frequency * wobble * droop / MUSIC_BOX_SAMPLE_RATE;
            const attack = Math.min(1, t / 0.006);
            const release = Math.min(1, (3 - t) / 0.08);
            const tine = 0.85 * Math.sin(phase) * Math.exp(-t / 0.65)
                + 0.12 * Math.sin(phase * 2.76) * Math.exp(-t / 0.22)
                + 0.03 * Math.sin(phase * 5.4) * Math.exp(-t / 0.1);
            const windingGain = stage === 4 ? 1 - 0.65 * note.beat / 16 : 1;
            samples[offset + i] += note.gain * windingGain * attack * release * tine;
        }
    }
    return samples;
}
