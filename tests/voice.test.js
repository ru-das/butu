import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceQueue } from '../src/voice.js';

test('stage queue crossfades, reserves whispers per visit, cancels stale speech, returns and ends silently', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const original = { Audio: globalThis.Audio, AudioContext: globalThis.AudioContext, chrome: globalThis.chrome };
    t.after(() => Object.assign(globalThis, original));
    const clips = [];
    let blocked = false;
    let pendingPlay;
    const param = () => ({ value: 0, cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; },
        linearRampToValueAtTime(v, at) { this.target = v; this.at = at; } });
    const node = () => ({ connect() { return this; }, disconnect() {} });
    globalThis.chrome = { runtime: { getURL: p => p } };
    globalThis.AudioContext = class {
        currentTime = 0; destination = {}; state = 'running';
        createGain() { return { ...node(), gain: param() }; }
        createMediaElementSource() { return node(); }
        resume() { return Promise.resolve(); }
        close() { this.state = 'closed'; return Promise.resolve(); }
    };
    globalThis.Audio = class {
        constructor(src) { this.src = src; clips.push(this); }
        play() { this.played = true; return pendingPlay ?? (blocked ? Promise.reject(Error('blocked')) : Promise.resolve()); }
        pause() { this.paused = true; }
        removeAttribute() {} load() {}
    };
    const q = new VoiceQueue();
    const state = { session: 'one', visit: '[2,0,"a"]', stage: 1, volume: .25, tabs: { 2: {} } };
    const send = patch => { Object.assign(state, patch); q.update({ ...state }); };
    const flush = async ms => { t.mock.timers.tick(ms); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
    send({}); await flush(0);
    assert.equal(q.music.audio.loop, true);
    assert.equal(q.music.gain.gain.target, .25);
    const first = q.music;
    send({ stage: 2 });
    assert.equal(first.gain.gain.target, 0);
    await flush(0);
    assert.equal(q.music.gain.gain.at, 1.2);
    await flush(2000);
    assert.match(q.spoken.audio.src, /butu-06/);
    q.spoken.audio.onended();
    send({ stage: 3 }); await flush(2000);
    assert.match(q.spoken.audio.src, /crayon/);
    q.spoken.audio.onended();
    assert.match(q.spoken.audio.src, /butu-08/);
    send({ stage: 4 }); await flush(2000);
    assert.equal(q.music.audio.loop, false);
    assert.match(q.spoken.audio.src, /butu-12/);
    send({ stage: 0, visit: null, returned: false }); // tab activation pauses before the verdict
    send({ stage: 0, visit: '[3,0,"work"]', returned: true, tabs: { 2: {}, 3: {} } });
    assert.match(q.spoken.audio.src, /happy-return/);
    await flush(2100);
    assert.equal(q.players.size, 1);
    q.spoken.audio.onended();
    send({ stage: 2, visit: '[2,0,"a"]', returned: false }); await flush(2000);
    assert.equal(q.spoken, null, 'same visit whisper not repeated after return');
    send({ volume: 0 }); await flush(2000);
    assert.equal(q.players.size, 0);
    send({ volume: .25 }); await flush(2000);
    assert.ok(q.music, 'unmute resumes music');
    assert.equal(q.spoken, null, 'unmute does not replay a whisper');
    send({ visit: '[2,1,"a"]' }); await flush(2000);
    assert.match(q.spoken.audio.src, /butu-06/, 'reload permits whisper again');
    send({ stage: 3 });
    send({ stage: 0, session: null, visit: null, tabs: {} }); await flush(3000);
    assert.equal(q.players.size, 0);
    assert.equal(q.context, null);
    assert.equal(q.visits.size, 0);
    assert.equal(clips.filter(c => /butu-08/.test(c.src)).length, 1, 'queued speech cancelled at end');
    let unblock;
    pendingPlay = new Promise(resolve => { unblock = resolve; });
    send({ session: 'slow', stage: 1, visit: '[2,2,"a"]', tabs: { 2: {} } });
    await flush(0);
    assert.equal(q.music.gain.gain.value, 0, 'slow device stays silent before playback');
    assert.equal(q.music.gain.gain.target, undefined, 'fade waits for playback');
    unblock(); await flush(0);
    assert.equal(q.music.gain.gain.target, .25, 'fade begins when playback starts');
    pendingPlay = null;
    send({ stage: 0, session: null, tabs: {} }); await flush(3000);
    blocked = true;
    send({ session: 'two', stage: 2, visit: '[2,2,"a"]', tabs: { 2: {} } });
    await flush(2000); await flush(0);
    send({ stage: 0, session: null, tabs: {} }); await flush(3000);
    assert.equal(q.players.size, 0, 'blocked playback cleans up without errors');
});
