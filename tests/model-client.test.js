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
    const { comparePage } = await import('../src/model-host/client.js');
    assert.equal(workers.length, 0);
    assert.deepEqual((await comparePage('Study DBMS', 'Normalization')).scores, [0.5]);
    assert.equal((await comparePage('Study DBMS', 'Normalization')).cached, true);
    assert.equal(workers.length, 1);
    t.mock.timers.tick(5000);
    assert.equal(workers[0].terminated, true);
});
