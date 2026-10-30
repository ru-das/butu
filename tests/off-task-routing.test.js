import assert from 'node:assert/strict';
import test from 'node:test';

test('timing messages verify browser focus, persist across wakes, reset across tabs and end with the session', async t => {
    let now = 1000;
    t.mock.method(Date, 'now', () => now);
    t.mock.method(console, 'log', () => {});
    const originalChrome = globalThis.chrome;
    t.after(() => { globalThis.chrome = originalChrome; });
    let stored = { session: { task: 'Study DBMS', startedAt: now, endsAt: now + 600000 },
        allowlist: ['work.test'], blocklist: ['play.test'] };
    const tabs = new Map([
        [1, { id: 1, windowId: 10, active: true, url: 'https://play.test/a' }],
        [2, { id: 2, windowId: 20, active: true, url: 'https://play.test/b' }],
        [3, { id: 3, windowId: 10, active: false, url: 'https://work.test/' }],
    ]);
    let focused = 10;
    let message;
    let activated;
    let focusChanged;
    let removed;
    let startup;
    let revision = 0;
    const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
    async function boot() {
        globalThis.chrome = {
            runtime: { id: 'bear', getURL: path => `chrome-extension://bear/${path}`,
                onMessage: { addListener: fn => { message = fn; } },
                onStartup: { addListener: fn => { startup = fn; } }, onInstalled: { addListener() {} } },
            storage: { local: {
                get: (keys, cb) => queueMicrotask(() => cb(structuredClone(stored))),
                set: (value, cb) => { stored = { ...stored, ...structuredClone(value) }; queueMicrotask(cb); },
            } },
            alarms: { create() {}, clear: (name, cb) => cb(), onAlarm: { addListener() {} } },
            tabs: {
                get: (id, cb) => cb({ ...tabs.get(id) }),
                query: (options, cb) => cb([...tabs.values()].filter(tab => tab.active)),
                sendMessage: (id, msg, options, cb) => { assert.equal(msg.type, 'timing:poll'); cb({}); },
                onActivated: { addListener: fn => { activated = fn; } },
                onUpdated: { addListener() {} }, onRemoved: { addListener: fn => { removed = fn; } },
            },
            windows: { get: (id, cb) => cb({ id, focused: id === focused }),
                onFocusChanged: { addListener: fn => { focusChanged = fn; } } },
        };
        await import(`../src/background.js?timing=${revision++}`);
        await flush();
    }
    const activity = (id, visible = true) => new Promise(resolve => {
        const tab = tabs.get(id);
        assert.equal(message({ type: 'timing:activity', url: tab.url, visible },
            { id: 'bear', frameId: 0, url: tab.url, tab }, resolve), true);
    });
    const view = msg => new Promise(resolve => message(msg,
        { id: 'bear', url: 'chrome-extension://bear/src/popup/popup.html' }, resolve));
    const seconds = id => stored.offTaskTiming.tabs[id].seconds;
    await boot();
    activated({ tabId: 1, windowId: 10 });
    activated({ tabId: 2, windowId: 20 });
    await flush();
    assert.equal((await activity(1)).stage, 0, 'grace period has no visuals');
    now += 15000;
    await activity(2);
    assert.equal(seconds(1), 15);
    assert.equal(seconds(2), 0, 'active tab in an unfocused window cannot count');
    assert.equal((await activity(1, false)).stage, 1, 'stage is returned for the sender tab');
    now += 90000;
    await activity(1, false);
    assert.equal(seconds(1), 15, 'hidden time excluded');
    await activity(1);
    now += 2000;
    focused = -1;
    focusChanged(-1);
    await flush();
    now += 90000;
    await activity(1);
    assert.equal(seconds(1), 17, 'visible unfocused time excluded');
    focused = 10;
    await activity(1);
    await boot();
    now += 3000;
    await activity(1);
    assert.equal(seconds(1), 20, 'background wake preserves accumulated time');
    now += 30000;
    startup();
    await flush();
    assert.equal(seconds(1), 20, 'browser restart does not charge downtime');
    const invalid = { type: 'timing:activity', url: tabs.get(1).url, visible: true };
    assert.equal(message(invalid, { id: 'other', frameId: 0, url: invalid.url, tab: tabs.get(1) }, () => {}), undefined);
    assert.equal(message(invalid, { id: 'bear', frameId: 1, url: invalid.url, tab: tabs.get(1) }, () => {}), undefined);
    tabs.get(1).active = false;
    tabs.get(3).active = true;
    activated({ tabId: 3, windowId: 10 });
    await flush();
    await activity(3);
    assert.equal((await activity(1, false)).stage, 0, 'returning to work suppresses haunting in other tabs');
    now += 59999;
    await activity(3);
    assert.equal(seconds(1), 20);
    now++;
    await activity(3);
    assert.equal(seconds(1), 0, '60 seconds on an on-task tab resets other tabs');
    removed(2);
    await flush();
    assert.equal(stored.offTaskTiming.tabs[2], undefined);
    await view({ type: 'session:stop' });
    await activity(3);
    assert.equal(stored.offTaskTiming, null, 'late activity cannot revive a stopped session');
    await view({ type: 'session:start', task: 'New work', minutes: 5 });
    await flush();
    await activity(3);
    assert.equal(stored.offTaskTiming.tabs[1], undefined, 'new session starts with fresh timers');
});
