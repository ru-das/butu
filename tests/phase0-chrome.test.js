const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

const worker = readFileSync('experiments/phase0/src/model-host/chrome-worker.js', 'utf8');

test('Chrome worker creates the offscreen host, reuses it on restart, and reports failures', async () => {
    let documents = [];
    const calls = [];
    const errors = [];
    let listener;
    const messages = [];
    const chrome = {
        runtime: {
            id: 'test',
            onMessage: { addListener: fn => { listener = fn; } },
            sendMessage: async message => { messages.push(message); return { playing: true }; },
            getURL: path => `chrome-extension://test/${path}`,
            getContexts: async options => {
                assert.equal(options.contextTypes[0], 'OFFSCREEN_DOCUMENT');
                assert.equal(options.documentUrls[0], 'chrome-extension://test/src/model-host/offscreen.html');
                return documents;
            },
        },
        offscreen: {
            createDocument: async options => {
                calls.push(options);
                documents = [{}];
            },
        },
    };
    const run = async () => {
        runInNewContext(worker, { chrome, console: { log() {}, error: (...args) => errors.push(args) } });
        await new Promise(resolve => setImmediate(resolve));
    };
    await run();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'src/model-host/offscreen.html');
    assert.equal(calls[0].reasons[0], 'WORKERS');
    assert.equal(calls[0].reasons[1], 'AUDIO_PLAYBACK');
    await run();
    assert.equal(calls.length, 1, 'worker restart must not restart inference');
    assert.equal(errors.length, 0);
    // Simulate Chrome closing the audio host after silence; a message recreates it.
    documents = [];
    let reply;
    assert.equal(listener({ type: 'phase0:play-audio' }, { id: 'test' }, value => { reply = value; }), true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.length, 2);
    assert.equal(messages[0].target, 'model-host');
    assert.equal(reply.playing, true);
    assert.equal(listener(messages[0], { id: 'test' }, () => {}), undefined);
    chrome.runtime.getContexts = async () => { throw new Error('unavailable'); };
    await run();
    assert.equal(errors[0][0], '[phase0] Offscreen FAILED:');
    assert.equal(errors[0][1].message, 'unavailable');
});
