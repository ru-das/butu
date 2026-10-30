import assert from 'node:assert/strict';
import test from 'node:test';
import { pagePolicy, pageEmbeddingText, scoreVerdict, sessionKey } from '../src/lib/verdict.js';
import { EMBEDDING_LIMITS } from '../src/config.js';

test('exclusions precede domain rules; allowlist precedes blocklist with domain boundaries', () => {
    for (const url of ['chrome://newtab/', 'chrome://settings/', 'about:newtab', 'about:blank',
        'edge://newtab/', 'chrome-search://local-ntp/local-ntp.html', 'moz-extension://bear/diary.html',
        'chrome-extension://bear/popup.html', 'file:///tmp/test', 'data:text/html,test', '', undefined]) {
        assert.equal(pagePolicy(url, ['bear'], ['bear']).source, 'excluded');
    }
    assert.equal(pagePolicy('https://docs.example.com/path', [' EXAMPLE.COM. '], ['docs.example.com']).onTask, true);
    assert.equal(pagePolicy('https://example.com/', [], ['example.com']).onTask, false);
    assert.equal(pagePolicy('https://notexample.com/', ['example.com']), null);
    assert.equal(pagePolicy('https://example.com.evil.test/', ['example.com']), null);
    assert.equal(pagePolicy('https://example.com/', null, {}), null);
});

test('bounded input, validated scores and explicit untuned verdict', () => {
    const text = pageEmbeddingText({ title: '  Database\n systems ', description: 'Normal forms', mainText: 'Examples' });
    assert.equal(text, 'Database systems Normal forms Examples');
    assert.equal(pageEmbeddingText({ title: 'a'.repeat(3000), description: '', mainText: '' }).length, EMBEDDING_LIMITS.pageChars);
    assert.throws(() => pageEmbeddingText({ error: 'failed' }));
    assert.deepEqual(scoreVerdict(0.4), { onTask: null, source: 'threshold-unset', score: 0.4 });
    assert.equal(scoreVerdict(0.4, 0.4).onTask, true);
    assert.equal(scoreVerdict(0.39, 0.4).onTask, false);
    for (const score of [NaN, Infinity, 1.1, -1.1, null, '0.5']) assert.throws(() => scoreVerdict(score));
    assert.notEqual(sessionKey({ startedAt: 1, endsAt: 2, task: 'a' }), sessionKey({ startedAt: 1, endsAt: 2, task: 'b' }));
});
