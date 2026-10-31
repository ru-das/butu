import assert from 'node:assert/strict';
import test from 'node:test';
import { diarySessions, sessionDrawing } from '../src/lib/diary.js';

const entry = { task: 'Study DBMS', startedAt: 0, elapsedSeconds: 600,
    offTaskSeconds: 0, timesWandered: 0 };

test('drawing follows off-task share, including exact boundaries and an instant stop', () => {
    for (const [offTaskSeconds, file] of [[0, 'butu-calm'], [59.9, 'butu-calm'],
        [60, 'butu-waiting'], [180, 'butu-waiting'], [180.1, 'butu-wrong'], [600, 'butu-wrong']]) {
        assert.equal(sessionDrawing({ ...entry, offTaskSeconds }).file, file);
    }
    assert.equal(sessionDrawing({ ...entry, elapsedSeconds: 0 }).file, 'butu-calm');
    assert.equal(sessionDrawing({ ...entry, elapsedSeconds: 1200, offTaskSeconds: 120 }).file, 'butu-waiting');
});

test('diary shows the newest 50 valid saved pages without mutating history', () => {
    const history = Array.from({ length: 55 }, (_, i) => ({ ...entry, task: `Page ${i}` }));
    const original = structuredClone(history);
    const pages = diarySessions(history);
    assert.equal(pages.length, 50);
    assert.equal(pages[0].task, 'Page 54');
    assert.equal(pages.at(-1).task, 'Page 5');
    assert.deepEqual(history, original);
    for (const invalid of [null, {}, 'bad', [null, {}, { ...entry, startedAt: 9e15 },
        { ...entry, elapsedSeconds: NaN }, { ...entry, timesWandered: -1 }]]) {
        assert.deepEqual(diarySessions(invalid), []);
    }
    assert.deepEqual(diarySessions([null, entry, {}]), [entry]);
});
