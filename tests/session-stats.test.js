import assert from 'node:assert/strict';
import test from 'node:test';
import { saveSession } from '../src/lib/session-stats.js';
import { updateTiming } from '../src/lib/off-task-timer.js';
import { sessionKey } from '../src/lib/verdict.js';

const session = { task: 'Study DBMS', startedAt: 0, endsAt: 300000 };
test('totals survive stage resets, closed tabs, navigation and restart; only foreground intervals count', () => {
    let timing;
    let now = 0;
    const send = (event, seconds = 0) => {
        now += seconds * 1000;
        timing = updateTiming(timing, event, now);
        timing.sessionKey = sessionKey(session);
    };
    const verdict = (onTask, url = 'https://play.test/private?secret=yes') =>
        ({ type: 'verdict', tabId: 1, windowId: 1, url, onTask });
    const activity = { type: 'activity', tabId: 1, windowId: 1,
        url: 'https://play.test/private?secret=yes', visible: true, focused: true };
    send(verdict(false));
    send(activity);
    send(activity, 10);
    send(activity, 10);
    assert.equal(timing.stats.timesWandered, 1, 'ticks are not new wanders');
    send({ type: 'navigate', tabId: 1 });
    send(verdict(false));
    send(activity);
    send(activity, 5);
    assert.equal(timing.stats.timesWandered, 2, 'same-URL navigation is a new visit');
    send(verdict(true));
    send(activity, 60);
    assert.equal(timing.tabs[1].seconds, 0);
    assert.equal(timing.stats.offTaskSeconds, 25, 'stage reset preserves totals');
    send(verdict(false));
    send(activity, 5);
    send({ type: 'restart' }, 100);
    send({ type: 'remove', tabId: 1 });
    assert.equal(timing.stats.offTaskSeconds, 30, 'restart and removal preserve totals without downtime');
    const [entry] = saveSession([], session, timing, now);
    assert.equal(entry.timesWandered, 3);
    assert.equal(entry.offTaskSeconds, 30);
    assert.deepEqual(entry.domains, ['play.test']);
    assert.ok(!JSON.stringify(entry).includes('secret'));
});

test('final interval is flushed and clamped, history retains 50, stale timing is ignored', () => {
    let timing = updateTiming(null, { type: 'verdict', tabId: 1,
        url: 'https://play.test/', onTask: false }, 0);
    timing = updateTiming(timing, { type: 'activity', tabId: 1,
        url: 'https://play.test/', visible: true, focused: true }, 0);
    timing.sessionKey = sessionKey(session);
    const original = structuredClone(timing);
    const [stopped] = saveSession([], session, timing, 12500);
    assert.equal(stopped.offTaskSeconds, 12.5);
    assert.equal(stopped.elapsedSeconds, 12.5);
    assert.equal(stopped.completed, false);
    assert.equal(stopped.timesWandered, 1);
    assert.deepEqual(timing, original);
    const [expired] = saveSession([], session, timing, 999999);
    assert.equal(expired.endedAt, session.endsAt);
    assert.equal(expired.offTaskSeconds, 300);
    assert.equal(expired.completed, true);
    assert.ok(expired.caption);
    const [stale] = saveSession([], { ...session, startedAt: 1 }, timing, 10000);
    assert.equal(stale.offTaskSeconds, 0);
    let history = [];
    for (let i = 0; i < 55; i++) history = saveSession(history, { ...session, task: `Task ${i}` }, null, 1000);
    assert.equal(history.length, 50);
    assert.equal(history[0].task, 'Task 5');
    assert.equal(history.at(-1).task, 'Task 54');
    assert.equal(saveSession(history, null, null), history);
    assert.equal(saveSession(history, { endsAt: 0 }, null), history);
});
