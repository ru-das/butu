const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

test('audio message plays a local clip; replay resets; rejected playback stays silent', async () => {
    let listener, player, blocked = false;
    const location = { pathname: '/background.html' };
    const replies = [];
    runInNewContext(readFileSync('src/model-host/audio-probe.js', 'utf8'), {
        Audio: class {
            constructor(url) { this.url = url; player = this; }
            pause() { this.paused = true; }
            play() { return blocked ? Promise.reject(new Error('blocked')) : Promise.resolve(); }
        },
        location,
        chrome: { runtime: {
            id: 'test', getURL: path => `extension://${path}`,
            onMessage: { addListener: fn => { listener = fn; } },
        } },
    });
    const send = (type = 'phase0:play-audio', id = 'test', target) => listener({ type, target }, { id }, reply => replies.push(reply.playing));
    assert.equal(send('unknown'), undefined);
    assert.equal(send('phase0:play-audio', 'other'), undefined);
    assert.equal(replies.length, 0);
    assert.equal(player.url, 'extension://assets/audio/test-chime.mp3');
    assert.equal(player.volume, 0.3);
    player.currentTime = 1;
    assert.equal(send(), true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(player.currentTime, 0);
    assert.equal(player.paused, true);
    blocked = true;
    assert.equal(send(), true);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(replies, [true, false]);
    location.pathname = '/src/model-host/offscreen.html';
    assert.equal(send(), undefined, 'offscreen ignores the public request handled by its service worker');
    assert.equal(send('phase0:play-audio', 'test', 'model-host'), true);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(replies, [true, false, false]);
});
