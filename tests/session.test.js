import assert from 'node:assert/strict';
import test from 'node:test';
import { createSession, remainingSeconds, formatCountdown } from '../src/lib/session.js';

test('session validates trimmed tasks and positive whole-minute durations', () => {
    assert.deepEqual(createSession('  Study DBMS  ', 25, 1000), {
        task: 'Study DBMS', startedAt: 1000, endsAt: 1501000,
    });
    for (const task of ['', '   ', 'ab', 'a'.repeat(201), null, {}]) {
        assert.throws(() => createSession(task, 25, 1000));
    }
    for (const minutes of [0, -1, 1.5, NaN, Infinity, '25', Number.MAX_SAFE_INTEGER]) {
        assert.throws(() => createSession('Study DBMS', minutes, 1000));
    }
    assert.equal(createSession('a'.repeat(200), 1, 1000).task.length, 200);
    assert.equal(createSession('<b>DBMS</b>', 45, 1000).task, '<b>DBMS</b>');
});

test('countdown uses the stored deadline across long gaps and clamps at zero', () => {
    const session = createSession('Study DBMS', 1, 1000);
    assert.equal(formatCountdown(remainingSeconds(session, 1000)), '01:00');
    assert.equal(formatCountdown(remainingSeconds(session, 11000)), '00:50');
    assert.equal(remainingSeconds(session, 60001), 1);
    assert.equal(remainingSeconds(session, 61000), 0);
    assert.equal(remainingSeconds(session, 120000), 0);
    assert.equal(formatCountdown(3600), '60:00');
    for (const bad of [null, {}, { ...session, endsAt: '61000' },
        { ...session, endsAt: Infinity }, { ...session, endsAt: 0 },
        { ...session, task: {} }, { ...session, startedAt: -1 }]) {
        assert.equal(remainingSeconds(bad, 1000), 0);
    }
});
