import assert from 'node:assert/strict';
import test from 'node:test';
import { sessionKey } from '../src/lib/verdict.js';

// Exercise the real entry point with callback-style APIs, as exposed in Firefox.
test('background owns sessions across popup closure, wake, alarms and concurrent commands', async (t) => {
    let now = 1000;
    t.mock.method(Date, 'now', () => now);
    let stored = {};
    let alarm;
    let failWrite = false;
    let failAlarm = false;
    let listeners;
    let revision = 0;
    const flush = () => new Promise((resolve) => setImmediate(resolve));
    const originalChrome = globalThis.chrome;
    t.after(() => { globalThis.chrome = originalChrome; });

    async function boot() {
        listeners = {};
        globalThis.chrome = {
            runtime: {
                id: 'butu-test',
                getURL: (path) => `chrome-extension://butu-test/${path}`,
                onMessage: { addListener: (fn) => { listeners.message = fn; } },
                onStartup: { addListener: (fn) => { listeners.startup = fn; } },
                onInstalled: { addListener: (fn) => { listeners.installed = fn; } },
            },
            storage: { local: {
                get: (key, cb) => queueMicrotask(() => cb(structuredClone(stored))),
                set: (value, cb) => queueMicrotask(() => {
                    if (failWrite) chrome.runtime.lastError = { message: 'write failed' };
                    else stored = { ...stored, ...structuredClone(value) };
                    cb();
                    delete chrome.runtime.lastError;
                }),
            } },
            alarms: {
                create: (name, options) => {
                    if (failAlarm) throw new Error('alarm failed');
                    alarm = { name, scheduledTime: options.when };
                },
                clear: (name, cb) => { alarm = undefined; queueMicrotask(cb); },
                onAlarm: { addListener: (fn) => { listeners.alarm = fn; } },
            },
            tabs: {
                query: (options, cb) => cb([]),
                onActivated: { addListener() {} },
                onUpdated: { addListener() {} },
                onRemoved: { addListener() {} },
            },
            windows: { onFocusChanged: { addListener() {} } },
        };
        await import(`../src/background.js?test=${revision++}`);
        await flush();
    }
    const send = (message) => new Promise((resolve) => {
        assert.equal(listeners.message(message, { id: 'butu-test', url: 'chrome-extension://butu-test/src/popup/popup.html', tab: { id: 1 } }, resolve), true);
    });
    const start = () => send({ type: 'session:start', task: '  Study DBMS  ', minutes: 1 });

    await boot();
    assert.deepEqual(await send({ type: 'session:get' }), { session: null });
    assert.ok((await send({ type: 'session:start', task: ' ', minutes: 1 })).error);
    assert.equal(stored.session, undefined);
    assert.equal(listeners.message({ type: 'session:stop' }, { id: 'other' }, () => {}), undefined);
    assert.equal(listeners.message({ type: 'session:stop' }, { id: 'butu-test', url: 'https://example.com/', tab: {} }, () => {}), undefined);

    const { session } = await start();
    assert.deepEqual(session, { task: 'Study DBMS', startedAt: 1000, endsAt: 61000 });
    assert.equal(alarm.scheduledTime, session.endsAt);
    now = 11000;
    assert.deepEqual((await start()).session, session, 'duplicate start preserves the deadline');

    // No popup exists; a fresh background reconstructs a discarded alarm.
    alarm = undefined;
    await boot();
    assert.equal(alarm.scheduledTime, session.endsAt);
    listeners.alarm({ name: 'unrelated' });
    await flush();
    assert.deepEqual(stored.session, session);
    now = 61000;
    listeners.alarm(alarm);
    await flush();
    assert.equal(stored.session, null, 'alarm ends session without a popup');
    assert.equal(alarm, undefined);
    assert.equal(stored.sessionHistory.length, 1);
    assert.equal(stored.sessionHistory[0].completed, true);
    assert.equal(stored.sessionHistory[0].elapsedSeconds, 60);

    await start();
    assert.deepEqual(await send({ type: 'session:stop' }), { session: null });
    assert.equal(stored.sessionHistory.length, 2, 'repeated stops do not archive twice');
    assert.equal(stored.session, null);
    assert.equal(alarm, undefined);
    assert.deepEqual(await send({ type: 'session:stop' }), { session: null });

    await start();
    const oldAlarm = alarm;
    const stopping = send({ type: 'session:stop' });
    const starting = start();
    listeners.alarm(oldAlarm);
    await Promise.all([stopping, starting]);
    await flush();
    assert.ok(stored.session, 'stale alarm does not end the new session early');

    // A browser restart after the deadline cleans up missed expiry.
    stored.offTaskTiming = { sessionKey: sessionKey(stored.session),
        tabs: { 1: { url: 'https://play.test/', onTask: false, seconds: 5 } },
        activeTabId: 1, updatedAt: now + 5000, onTaskSeconds: 0, wandering: true,
        stats: { offTaskSeconds: 5, timesWandered: 1, domains: ['play.test'] } };
    now += 120000;
    await boot();
    assert.equal(stored.session, null);
    assert.equal(stored.sessionHistory.at(-1).offTaskSeconds, 5, 'cold expiry never charges browser downtime');
    assert.equal(alarm, undefined);
    failWrite = true;
    const historyBeforeFailure = structuredClone(stored.sessionHistory);
    assert.ok((await start()).error);
    assert.equal(stored.session, null);
    failWrite = false;
    failAlarm = true;
    assert.ok((await start()).error);
    assert.equal(stored.session, null, 'alarm creation failure rolls back start');
    assert.deepEqual(stored.sessionHistory, historyBeforeFailure, 'failed starts are not sessions');
    failAlarm = false;
    assert.ok((await start()).session, 'queue recovers after errors');
    const activeBeforeFailure = structuredClone(stored.session);
    failWrite = true;
    assert.ok((await send({ type: 'session:stop' })).error);
    assert.deepEqual(stored.session, activeBeforeFailure, 'failed archive preserves active session');
    assert.deepEqual(stored.sessionHistory, historyBeforeFailure);
    failWrite = false;
    await send({ type: 'session:stop' });
    assert.equal(stored.sessionHistory.length, historyBeforeFailure.length + 1);
});
