import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDomains } from '../src/lib/settings.js';
import { pagePolicy } from '../src/lib/verdict.js';

test('settings parse unique domains and reject URL, path, wildcard and credentials', () => {
    const allowlist = parseDomains(' Example.COM.\nexample.com\n\nwork.example.org\r\n');
    assert.deepEqual(allowlist, ['example.com', 'work.example.org']);
    assert.deepEqual(parseDomains(' \n'), []);
    for (const value of ['https://example.com', 'example.com/path', '*.example.com',
        'user@example.com', 'example.com:80', 'two domains']) {
        assert.throws(() => parseDomains(value), TypeError, value);
    }
    assert.equal(pagePolicy('https://sub.example.com', allowlist, ['example.com']).onTask, true);
    assert.equal(pagePolicy('https://other.com', [], parseDomains('other.com')).onTask, false);
    assert.equal(pagePolicy('chrome://extensions', allowlist, ['extensions']).source, 'excluded');
});

test('preview requests accept extension views only and use saved audio settings', async t => {
    const original = globalThis.chrome;
    t.after(() => { globalThis.chrome = original; });
    let receive, changed, sent;
    let queries = 0;
    let saved = { muted: true, volume: .3 };
    globalThis.chrome = {
        runtime: { id: 'bear', getURL: path => `chrome-extension://bear/${path}`,
            getContexts: async () => [{ contextType: 'OFFSCREEN_DOCUMENT' }],
            sendMessage: async message => { sent = message; return { ok: true }; },
            onMessage: { addListener: fn => { receive = fn; } },
            onStartup: { addListener() {} }, onInstalled: { addListener() {} } },
        offscreen: {},
        storage: { local: { get: (keys, cb) => cb({ ...saved }) },
            onChanged: { addListener: fn => { changed = fn; } } },
        alarms: { clear: (name, cb) => cb(), onAlarm: { addListener() {} } },
        tabs: { query: (options, cb) => { queries++; cb([]); },
            onActivated: { addListener() {} }, onUpdated: { addListener() {} }, onRemoved: { addListener() {} } },
        windows: { onFocusChanged: { addListener() {} } },
    };
    await import('../src/background.js?settings-test');
    const message = { type: 'voice:test', volume: 1 };
    assert.equal(receive(message, { id: 'bear', url: 'https://example.com' }, () => assert.fail()), undefined);
    const sender = { id: 'bear', url: 'chrome-extension://bear/src/diary/settings.html' };
    const request = () => new Promise(resolve => receive(message, sender, resolve));
    assert.deepEqual(await request(), { ok: true, muted: true });
    assert.equal(sent, undefined);
    saved = { muted: false, volume: .3 };
    assert.deepEqual(await request(), { ok: true, muted: false });
    assert.deepEqual(sent, { target: 'model-host', type: 'voice:test', volume: .3 });
    changed({ allowlist: { newValue: ['work.example'] } }, 'local');
    assert.equal(queries, 1, 'saved domain changes re-evaluate active tabs');
    changed({ blocklist: {} }, 'sync');
    assert.equal(queries, 1);
});
