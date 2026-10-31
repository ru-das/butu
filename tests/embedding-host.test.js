const { test } = require('node:test');
const assert = require('node:assert/strict');
const modules = Promise.all([
    import('../src/model-host/embedding-host.js'),
    import('../src/config.js'),
    import('../src/lib/embedding-protocol.js'),
]);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function setup(overrides = {}) {
    const [{ EmbeddingHost }, { EMBEDDING_LIMITS }] = await modules;
    const workers = [];
    const host = new EmbeddingHost({
        limits: { ...EMBEDDING_LIMITS, idleMs: 20, timeoutMs: 1000, ...overrides },
        workerFactory: () => {
            const worker = { messages: [], terminated: false,
                postMessage(data) { this.messages.push(data); },
                terminate() { this.terminated = true; },
                answer(scores) { this.onmessage({ data: { id: this.messages.at(-1).id, scores, loadMs: 1, inferenceMs: 2 } }); },
            };
            workers.push(worker);
            return worker;
        },
    });
    return { host, workers };
}

test('lazy worker, immutable cached scores, idle termination, and new session', async () => {
    const { host, workers } = await setup();
    try {
        assert.equal(workers.length, 0);
        const pending = host.compare('DBMS homework', ['Third normal form']);
        assert.equal(workers.length, 1);
        workers[0].answer([0.4]);
        const result = await pending;
        result.scores[0] = 99;
        assert.deepEqual((await host.compare('DBMS homework', ['Third normal form'])).scores, [0.4]);
        assert.equal(workers[0].messages.length, 1);
        await pause(60);
        assert.equal(workers[0].terminated, true);
        assert.equal((await host.compare('DBMS homework', ['Third normal form'])).cached, true);
        assert.equal(workers.length, 1, 'cache hits do not reload an idle model');
        host.release();
        const next = host.compare('DBMS homework', ['Third normal form']);
        assert.equal(workers.length, 2, 'release clears the old session cache');
        workers[0].answer([0.9]);
        workers[1].answer([0.3]);
        assert.deepEqual((await next).scores, [0.3], 'late old-worker messages cannot finish a new job');
    } finally { host.release(); }
});

test('queue and cache stay bounded; duplicate queued requests reuse a result', async () => {
    const { host, workers } = await setup({ pending: 2, cacheEntries: 2 });
    try {
        const first = host.compare('DBMS homework', ['First page']);
        const duplicate = host.compare('DBMS homework', ['First page']);
        await assert.rejects(host.compare('DBMS homework', ['Third page']), /queue is full/);
        workers[0].answer([0.4]);
        await first;
        assert.equal((await duplicate).cached, true);
        assert.equal(workers[0].messages.length, 1);
        for (const title of ['Second page', 'Third page']) {
            const request = host.compare('DBMS homework', [title]);
            workers[0].answer([0.5]);
            await request;
        }
        assert.equal(host.cache.size, 2);
        const evicted = host.compare('DBMS homework', ['First page']);
        assert.equal(workers[0].messages.length, 4, 'oldest score was evicted');
        workers[0].answer([0.6]);
        assert.equal((await evicted).cached, false);
    } finally { host.release(); }
});

test('invalid worker results fail closed and the next request can restart', async () => {
    const { host, workers } = await setup();
    try {
        const bad = assert.rejects(host.compare('DBMS homework', ['A page']), /Invalid model/);
        workers[0].answer([NaN]);
        await bad;
        assert.equal(workers[0].terminated, true);
        const valid = host.compare('DBMS homework', ['A page']);
        workers[1].answer([0.1]);
        assert.equal((await valid).scores[0], 0.1);
    } finally { host.release(); }
});

test('release, worker errors, and timeouts reject pending work', async () => {
    for (const action of ['release', 'error', 'timeout']) {
        const { host, workers } = await setup({ timeoutMs: action === 'timeout' ? 20 : 1000 });
        try {
            const first = assert.rejects(host.compare('DBMS homework', ['First page']));
            const queued = assert.rejects(host.compare('DBMS homework', ['Second page']));
            if (action === 'release') host.release();
            if (action === 'error') workers[0].onerror();
            await Promise.all([first, queued]);
            assert.equal(workers[0].terminated, true);
            assert.equal(host.active, null);
            assert.equal(host.queue.length, 0);
        } finally { host.release(); }
    }
});

test('protocol rejects oversized inputs and malformed model data', async () => {
    const [, { EMBEDDING_LIMITS }, protocol] = await modules;
    for (const [task, pages] of [
        ['', ['page']], ['task', []], ['task', [' ']], ['x'.repeat(201), ['page']],
        ['task', ['x'.repeat(1025)]], ['task', ['a', 'b', 'c', 'd']], ['task', [null]], ['task', new Array(1)],
    ]) assert.throws(() => protocol.validateEmbeddingRequest(task, pages, EMBEDDING_LIMITS));
    for (const vector of [[0, 0], [NaN, 1], [Infinity, 1], [1], [1, ,]]) {
        assert.throws(() => protocol.validateEmbeddingVector(vector, 2));
    }
    assert.deepEqual(protocol.validateEmbeddingVector([0.5, -0.5], 2), [0.5, -0.5]);
    for (const scores of [[NaN], [Infinity], [1.1], [-1.1], [], '0.5', new Array(1)]) {
        assert.throws(() => protocol.validateEmbeddingScores(scores, 1));
    }
    const { host, workers } = await setup();
    await assert.rejects(host.compare('task', ['x'.repeat(1025)]));
    assert.equal(workers.length, 0, 'invalid input never starts a model');
    host.release();
});

test('progress is bounded, deduplicated and cannot resolve inference or survive release', async () => {
    const { host, workers } = await setup();
    const events = [];
    const pending = host.compare('DBMS homework', ['SQL'], event => events.push(event));
    const worker = workers[0], id = worker.messages[0].id;
    const progress = data => worker.onmessage({ data: { id, progress: data } });
    progress({ status: 'progress', progress: 30.6 });
    progress({ status: 'progress', progress: 30.9 });
    progress({ status: 'unknown' });
    progress({ status: 'ready' });
    assert.deepEqual(events, [{ state: 'loading', percent: null },
        { state: 'downloading', percent: 30 }, { state: 'ready', percent: null }]);
    assert.ok(host.active, 'model readiness is not an inference result');
    const rejected = assert.rejects(pending, /session ended/);
    host.release();
    await rejected;
    const count = events.length;
    progress({ status: 'progress', progress: 99 });
    assert.equal(events.length, count, 'terminated worker progress ignored');
});
