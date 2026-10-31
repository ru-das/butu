import test from 'node:test';
import assert from 'node:assert/strict';

test('bundled preview is host-only, bounded, replaceable, respects mute and cleans up blocked audio', async t => {
    const original = { chrome: globalThis.chrome, location: globalThis.location, Audio: globalThis.Audio };
    t.after(() => Object.assign(globalThis, original));
    let listener;
    let blocked = false;
    const clips = [];
    globalThis.location = { protocol: 'chrome-extension:' };
    globalThis.chrome = { runtime: { id: 'bear', getURL: path => `chrome-extension://bear/${path}`,
        onMessage: { addListener: fn => { listener = fn; } } } };
    globalThis.Audio = class {
        constructor(src) { this.src = src; clips.push(this); }
        play() { return blocked ? Promise.reject(Error('blocked')) : Promise.resolve(); }
        pause() { this.paused = true; }
        removeAttribute() { this.src = ''; }
        load() {}
    };
    const { testVoice, updateVoice } = await import('../src/model-host/voice-host.js');
    for (const value of [0, -1, 2, NaN, '0.5']) testVoice(value);
    assert.equal(clips.length, 0);
    const message = { target: 'model-host', type: 'voice:test', volume: .25 };
    const sender = { id: 'bear', url: 'chrome-extension://bear/src/background.js' };
    for (const bad of [{ ...sender, tab: { id: 1 } }, { ...sender, id: 'other' },
        { ...sender, url: 'https://example.com' }]) listener(message, bad, () => assert.fail());
    assert.equal(clips.length, 0);
    listener(message, sender, reply => assert.equal(reply.ok, true));
    assert.match(clips[0].src, /assets\/audio\/voice\/butu-01.mp3$/u);
    assert.equal(clips[0].volume, .25);
    testVoice(.4);
    assert.equal(clips[0].paused, true);
    const state = { session: null, endsAt: null, stage: 0, tabs: {}, volume: .1 };
    updateVoice(state);
    assert.equal(clips[1].volume, .1);
    updateVoice({ ...state, volume: 0 });
    assert.equal(clips[1].paused, true);
    blocked = true;
    testVoice(.3);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(clips[2].paused, true);
    assert.equal(clips[2].src, '');
    blocked = false;
    testVoice(.3);
    clips[3].onended();
    assert.equal(clips[3].src, '');
});
