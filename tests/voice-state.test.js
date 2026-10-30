import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceState } from '../src/lib/voice-state.js';
import { sessionKey } from '../src/lib/verdict.js';
import { updateTiming } from '../src/lib/off-task-timer.js';

test('audio follows only the foreground verdict, live session and bounded settings', () => {
    const session = { task: 'DBMS', startedAt: 1, endsAt: 100000 };
    const data = { session, offTaskTiming: { sessionKey: sessionKey(session), activeTabId: 2,
        tabs: { 2: { url: 'https://local.test/', onTask: false, seconds: 180 } } } };
    const state = voiceState(data, 2);
    assert.equal(state.stage, 4);
    assert.equal(state.volume, 0.25);
    assert.equal(voiceState({ ...data, muted: true }, 2).volume, 0);
    assert.equal(voiceState({ ...data, volume: 2 }, 2).volume, 1);
    assert.equal(voiceState(data, 100000).stage, 0);
    data.offTaskTiming.tabs[2].seconds = -1;
    assert.equal(voiceState(data, 2).stage, 0);
    data.offTaskTiming.tabs[2].seconds = 180;
    assert.equal(voiceState({ ...data, session: { ...session, task: '' } }, 2).session, null);
    data.offTaskTiming.activeTabId = null;
    assert.equal(voiceState(data, 2).stage, 0);
    data.offTaskTiming.activeTabId = 2;
    data.offTaskTiming.tabs[2].onTask = true;
    assert.equal(voiceState(data, 2).returned, true);
    data.offTaskTiming.sessionKey = 'stale';
    assert.equal(voiceState(data, 2).returned, false);
});

test('same-URL reload starts a fresh visit while preserving the tab timer', () => {
    const before = { tabs: { 2: { seconds: 45, onTask: false, url: 'https://a.test/' } },
        activeTabId: 2, onTaskSeconds: 0, updatedAt: 1000 };
    const after = updateTiming(before, { type: 'navigate', tabId: 2 }, 2000);
    assert.equal(after.tabs[2].visit, 1);
    assert.equal(after.tabs[2].seconds, 46);
    assert.equal(after.tabs[2].onTask, null);
    assert.equal(after.activeTabId, null);
    assert.equal(before.tabs[2].visit, undefined);
});
