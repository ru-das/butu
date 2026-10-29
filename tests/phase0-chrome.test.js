const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

const worker = readFileSync('experiments/phase0/src/model-host/chrome-worker.js', 'utf8');

test('Chrome worker creates the offscreen host, reuses it on restart, and reports failures', async () => {
    let documents = [];
    const calls = [];
    const errors = [];
    const chrome = {
        runtime: {
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
    await run();
    assert.equal(calls.length, 1, 'worker restart must not restart inference');
    assert.equal(errors.length, 0);
    chrome.runtime.getContexts = async () => { throw new Error('unavailable'); };
    await run();
    assert.equal(errors[0][0], '[phase0] Offscreen FAILED:');
    assert.equal(errors[0][1].message, 'unavailable');
});
