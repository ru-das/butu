import assert from 'node:assert/strict';
import test from 'node:test';

test('Firefox client lazily reuses a document host and releases its idle worker', async t => {
    const oldChrome = globalThis.chrome;
    const oldWorker = globalThis.Worker;
    t.after(() => { globalThis.chrome = oldChrome; globalThis.Worker = oldWorker; });
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const workers = [];
    globalThis.chrome = {};
    globalThis.Worker = class {
        constructor(url, options) {
            assert.ok(url.pathname.endsWith('/embedding-worker.js'));
            assert.equal(options.type, 'module');
            workers.push(this);
        }
        postMessage(message) {
            queueMicrotask(() => this.onmessage({ data: {
                id: message.id, scores: [0.5], loadMs: 0, inferenceMs: 1,
            } }));
        }
        terminate() { this.terminated = true; }
    };
    const { comparePage, releaseSessionHost } = await import('../src/model-host/client.js');
    assert.equal(workers.length, 0);
    assert.deepEqual((await comparePage('Study DBMS', 'Normalization')).scores, [0.5]);
    assert.equal((await comparePage('Study DBMS', 'Normalization')).cached, true);
    assert.equal(workers.length, 1);
    await releaseSessionHost();
    assert.equal(workers[0].terminated, true);
    assert.equal((await comparePage('Study DBMS', 'Normalization')).cached, false);
    assert.equal(workers.length, 2);
    t.mock.timers.tick(5000);
    assert.equal(workers[0].terminated, true);
});

test('Chrome stop closes an existing offscreen host and cancels dispatch awaiting creation', async t => {
    const oldChrome = globalThis.chrome;
    t.after(() => { globalThis.chrome = oldChrome; });
    let contexts = [];
    let finishCreation;
    let closed = 0;
    const messages = [];
    globalThis.chrome = {
        runtime: { getURL: p => `chrome-extension://test/${p}`, getContexts: async () => contexts,
            sendMessage: async m => { messages.push(m); return { scores: [.5] }; } },
        offscreen: {
            createDocument: () => new Promise(resolve => { finishCreation = () => { contexts = [{}]; resolve(); }; }),
            closeDocument: async () => { closed++; contexts = []; },
        },
    };
    const { comparePage, releaseSessionHost } = await import('../src/model-host/client.js?chrome');
    await releaseSessionHost();
    assert.equal(closed, 0, 'cleanup does not create a host');
    const comparing = comparePage('Study DBMS', 'SQL');
    const rejected = assert.rejects(comparing, /session ended/);
    await new Promise(resolve => setImmediate(resolve));
    const stopping = releaseSessionHost();
    finishCreation();
    await Promise.all([stopping, rejected]);
    assert.equal(closed, 1);
    assert.equal(messages.length, 0, 'a late creation cannot start inference after stop');
});
