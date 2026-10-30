const { test } = require('node:test');
const assert = require('node:assert/strict');

test('voice budget fails closed for absent quota, invalid inputs and exhausted caps', async () => {
    const { voiceBatchBudget } = await import('../src/lib/voice-budget.js');
    const nowMs = Date.UTC(2026, 9, 30);
    const budget = (lines, options) => voiceBatchBudget(lines, { nowMs, ...options });
    assert.equal(budget(['hello']).allowed, false);
    for (const lines of [null, [], [''], ['  '], [123], ['x'.repeat(301)]]) {
        assert.equal(budget(lines, { availableChars: 10000 }).allowed, false);
    }
    for (const availableChars of [NaN, Infinity, -1, '10000', 0]) {
        assert.equal(budget(['hello'], { availableChars }).allowed, false);
    }
    assert.deepEqual(budget(['hello'], { availableChars: 5, spentChars: 5995 }), { allowed: true, characters: 5, reason: null });
    assert.equal(budget(['hello'], { availableChars: 5, spentChars: 5996 }).allowed, false);
    assert.equal(budget(['a'.repeat(300), 'b'.repeat(300), 'c'], { availableChars: 10000 }).allowed, false);
    assert.equal(budget(['🐻'], { availableChars: 1 }).allowed, false);
    assert.equal(budget(['hello'], { availableChars: 5, batchLimit: 4 }).allowed, false);
    assert.equal(budget(['hello'], { availableChars: 100, nowMs: Date.UTC(2027, 0, 1) }).reason, 'voice-expired');
    assert.equal(budget(['hello'], { availableChars: 100, nowMs: NaN }).reason, 'voice-expired');
});
