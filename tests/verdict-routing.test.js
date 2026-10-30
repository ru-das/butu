import assert from 'node:assert/strict';
import test from 'node:test';
import { EMBEDDING_LIMITS } from '../src/config.js';

const flush = () => new Promise(resolve => setImmediate(resolve));

test('background routes overrides, caches per session URL across wakes, and rejects late inference', async t => {
    const originalChrome = globalThis.chrome;
    t.after(() => { globalThis.chrome = originalChrome; });
    const logs = [];
    t.mock.method(console, 'log', (...args) => logs.push(args));
    let stored = { session: { task: 'Study database systems', startedAt: Date.now(), endsAt: Date.now() + 60000 },
        allowlist: ['allowed.test'], blocklist: ['blocked.test'] };
    let tab = { id: 1, url: 'https://allowed.test/' };
    let extracts = 0;
    let comparisons = 0;
    let creates = 0;
    let documents = [];
    let listener;
    let activated;
    let updated;
    let answer;
    let delayed = false;
    const boot = async revision => {
        globalThis.chrome = {
            runtime: {
                id: 'bear', getURL: path => `chrome-extension://bear/${path}`,
                getContexts: async () => documents,
                sendMessage: async message => {
                    assert.equal(message.target, 'model-host');
                    comparisons++;
                    if (delayed) return new Promise(resolve => { answer = resolve; });
                    return { scores: [0.6] };
                },
                onMessage: { addListener: fn => { listener = fn; } },
                onStartup: { addListener() {} }, onInstalled: { addListener() {} },
            },
            offscreen: { createDocument: async () => { creates++; documents = [{}]; } },
            storage: { local: {
                get: (keys, cb) => queueMicrotask(() => cb(structuredClone(stored))),
                set: (value, cb) => { stored = { ...stored, ...structuredClone(value) }; queueMicrotask(cb); },
            } },
            alarms: { create() {}, clear: (name, cb) => cb(), onAlarm: { addListener() {} } },
            tabs: {
                get: (id, cb) => queueMicrotask(() => cb({ ...tab })),
                query: (options, cb) => cb([tab]),
                sendMessage: (id, message, options, cb) => {
                    extracts++;
                    assert.equal(options.frameId, 0);
                    queueMicrotask(() => cb({ url: tab.url, title: 'Database normalization', description: '', mainText: 'Normal forms' }));
                },
                onActivated: { addListener: fn => { activated = fn; } },
                onUpdated: { addListener: fn => { updated = fn; } },
            },
        };
        await import(`../src/background.js?routing=${revision}`);
        await flush();
    };
    const visit = async url => { tab.url = url; activated({ tabId: 1 }); await flush(); await flush(); };
    await boot(1);
    await visit('https://allowed.test/');
    assert.equal(logs.at(-1)[1].source, 'allowlist');
    await visit('https://blocked.test/');
    assert.equal(logs.at(-1)[1].onTask, false);
    assert.equal(extracts, 0);
    assert.equal(creates, 0);
    const count = logs.length;
    for (const url of ['about:newtab', 'chrome://newtab/', 'moz-extension://bear/diary.html']) await visit(url);
    assert.equal(logs.length, count);
    await visit('https://study.test/page');
    assert.equal(comparisons, 1);
    assert.equal(creates, 1);
    assert.equal(logs.at(-1)[1].score, 0.6);
    assert.equal(logs.at(-1)[1].onTask, null);
    await visit('https://study.test/page');
    assert.equal(logs.at(-1)[1].cached, true);
    assert.equal(comparisons, 1);
    await boot(2);
    await visit('https://study.test/page');
    assert.equal(comparisons, 1, 'URL scores survive background wake');
    stored.blocklist.push('study.test');
    await visit('https://study.test/page');
    assert.equal(logs.at(-1)[1].source, 'blocklist', 'changed rules override cached scores');
    stored.blocklist = [];
    for (let i = 0; i <= EMBEDDING_LIMITS.cacheEntries; i++) await visit(`https://study.test/bounded/${i}`);
    assert.equal(stored.verdictCache.entries.length, EMBEDDING_LIMITS.cacheEntries);
    assert.ok(!stored.verdictCache.entries.some(entry => entry.url === 'https://study.test/bounded/0'));
    delayed = true;
    await visit('https://study.test/slow');
    const beforeLate = logs.length;
    tab.url = 'https://study.test/new';
    answer({ scores: [0.9] });
    await flush(); await flush();
    assert.equal(logs.length, beforeLate, 'old page result is discarded');
    await visit('https://study.test/new');
    const stop = new Promise(resolve => listener({ type: 'session:stop' },
        { id: 'bear', url: 'chrome-extension://bear/src/popup/popup.html' }, resolve));
    await stop;
    answer({ scores: [0.9] });
    await flush(); await flush();
    assert.equal(stored.verdictCache, null, 'late results cannot repopulate ended session');
    assert.equal(logs.length, beforeLate);
    assert.ok(updated);
});
