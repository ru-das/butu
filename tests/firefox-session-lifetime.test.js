const { test } = require('node:test');
const assert = require('node:assert/strict');

test('Firefox heartbeat is session-scoped, expires, cleans up and rejects stale failures', async t => {
    const { FirefoxSessionLifetime } = await import('../src/model-host/firefox-session-lifetime.js');
    t.mock.timers.enable({ apis: ['Date', 'setInterval', 'setTimeout'], now: 1000 });
    let calls = 0, rejectOld;
    const ended = [];
    const lifetime = new FirefoxSessionLifetime(reason => ended.push(reason), {
        getPlatformInfo() { calls++; return Promise.resolve({}); },
    });
    assert.equal(calls, 0, 'installation alone must not start the heartbeat');
    for (const end of [NaN, Infinity, '90000', 0, 1000, 3_000_000_000]) {
        assert.throws(() => lifetime.start(end), RangeError);
    }
    lifetime.start(46_000);
    assert.throws(() => lifetime.start(NaN), RangeError);
    assert.equal(lifetime.session.endsAt, 46_000, 'invalid start leaves the active session intact');
    assert.equal(calls, 1);
    t.mock.timers.tick(20_000);
    assert.equal(calls, 2);
    lifetime.stop();
    t.mock.timers.tick(60_000);
    assert.equal(calls, 2, 'manual stop cancels heartbeat');
    assert.deepEqual(ended, ['stopped']);
    lifetime.start(Date.now() + 21_000);
    t.mock.timers.tick(21_000);
    assert.equal(lifetime.session, null);
    assert.equal(ended.at(-1), 'expired');
    const afterExpiry = calls;
    t.mock.timers.tick(60_000);
    assert.equal(calls, afterExpiry);

    lifetime.runtime.getPlatformInfo = () => new Promise((_, reject) => { rejectOld = reject; });
    lifetime.start(Date.now() + 60_000);
    lifetime.runtime.getPlatformInfo = () => Promise.resolve({});
    lifetime.start(Date.now() + 60_000);
    rejectOld(new Error('old session failed'));
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(lifetime.session, 'old rejection cannot stop the replacement session');
    lifetime.runtime.getPlatformInfo = () => Promise.reject(new Error('API failed'));
    t.mock.timers.tick(20_000);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(lifetime.session, null);
    assert.equal(ended.at(-1), 'heartbeat-failed');
    assert.equal(lifetime.heartbeat, null);
    assert.equal(lifetime.expiry, null);

    lifetime.runtime.getPlatformInfo = () => { calls++; return Promise.resolve({}); };
    lifetime.start(Date.now() + 60_000);
    const beforeSleep = calls;
    t.mock.timers.setTime(Date.now() + 70_000);
    t.mock.timers.tick(20_000);
    assert.equal(lifetime.session, null, 'wall-clock expiry wins after sleep/delayed timers');
    assert.equal(calls, beforeSleep, 'an expired session sends no more heartbeat calls');
});
