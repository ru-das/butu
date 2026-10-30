// Original offline fallbacks, CC0-1.0. No recordings or external samples.
export const SFX_SAMPLE_RATE = 44100;
export const SFX_CLIPS = [
    { name: 'crayon-scribbling', duration_seconds: 3,
        prompt: 'Close-up of a wax crayon scribbling little doodles on textured paper. Soft dry grainy strokes, short irregular back-and-forth movements, tiny pauses. Gentle and intimate, quiet room, no voices, no music, no sharp impacts.' },
    { name: 'happy-return-chime', duration_seconds: 2,
        prompt: 'A tiny warm toy bell welcome chime, softly rising with a happy relieved feeling, like a teddy bear greeting a returning friend. Delicate rounded music-box tones with a short gentle decay into silence. No voices, no dramatic swell, no harsh attack.' },
];

export function renderSfx(name) {
    const clip = SFX_CLIPS.find(item => item.name === name);
    if (!clip) throw new RangeError('Unknown sound effect.');
    const samples = new Float32Array(clip.duration_seconds * SFX_SAMPLE_RATE);
    let seed = 17;
    let previous = 0;
    for (let i = 0; i < samples.length; i++) {
        const t = i / SFX_SAMPLE_RATE;
        let sample = 0;
        if (name === 'crayon-scribbling') {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            const noise = seed / 2147483648 - 1;
            const stroke = Math.max(0, Math.sin(2 * Math.PI * 3.7 * t + 0.7 * Math.sin(9 * t)));
            sample = (noise - previous) * 0.065 * stroke * stroke;
            previous = noise;
        } else {
            for (const [start, frequency] of [[0.08, 523.251], [0.3, 659.255], [0.52, 783.991]]) {
                const age = t - start;
                if (age >= 0) sample += 0.12 * Math.min(1, age / 0.015) * Math.exp(-5 * age) *
                    (Math.sin(2 * Math.PI * frequency * age) + 0.2 * Math.sin(2 * Math.PI * frequency * 2.01 * age));
            }
        }
        const fade = Math.max(0, Math.min(1, t / 0.03, (clip.duration_seconds - 0.05 - t) / 0.15));
        samples[i] = fade === 0 ? 0 : sample * fade;
    }
    return samples;
}
