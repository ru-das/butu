const { test } = require('node:test');
const assert = require('node:assert/strict');

test('original lullaby slows without pitch shift, detunes, then winds down to silence', async () => {
    const { MUSIC_BOX_BARS, MUSIC_BOX_SAMPLE_RATE, musicBoxNotes, renderMusicBox } = await import('../src/lib/music-box.js');
    assert.equal(MUSIC_BOX_BARS.length, 8);
    for (const bar of MUSIC_BOX_BARS) assert.equal(bar.reduce((sum, [, beats]) => sum + beats, 0), 3);
    assert.throws(() => musicBoxNotes(0), RangeError);
    const [tuned, slow, detuned, winding] = [1, 2, 3, 4].map(musicBoxNotes);
    assert.deepEqual(tuned.map(n => n.midi), slow.map(n => n.midi));
    for (const [i, note] of slow.entries()) {
        assert.ok(Math.abs(note.start - 0.1 - (tuned[i].start - 0.1) * 1.25) < 1e-10);
        assert.equal(note.cents, 0);
        assert.equal(note.start, detuned[i].start);
    }
    assert.ok(detuned.some(n => n.cents < 0) && detuned.some(n => n.cents > 0));
    assert.ok(winding.at(-1).cents < -400);
    const melody = winding.filter(n => n.gain === 0.14);
    const spacing = melody.slice(1).map((n, i) => (n.start - melody[i].start) / (n.beat - melody[i].beat));
    assert.ok(spacing.at(-1) > spacing[0] * 2);
    for (const stage of [1, 2, 3, 4]) {
        const samples = renderMusicBox(stage);
        let peak = 0;
        for (const sample of samples) {
            assert.ok(Number.isFinite(sample));
            peak = Math.max(peak, Math.abs(sample));
        }
        assert.ok(peak > 0.05 && peak < 0.3, `stage ${stage}: quiet, non-silent, no clipping`);
        assert.equal(samples[0], 0);
        const silentTail = stage === 4 ? MUSIC_BOX_SAMPLE_RATE : MUSIC_BOX_SAMPLE_RATE / 10;
        assert.ok(samples.slice(-silentTail).every(n => n === 0), 'tail is silent; winding stage stays stopped for a second');
    }
});
