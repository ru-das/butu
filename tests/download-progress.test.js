import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadProgress } from '../src/lib/download-progress.js';

test('download progress distinguishes unknown bytes, per-file progress and readiness', () => {
    assert.deepEqual(downloadProgress({ status: 'download' }), { state: 'loading', percent: null });
    assert.deepEqual(downloadProgress({ status: 'progress', progress: 42.9, file: '<script>' }), { state: 'downloading', percent: 42 });
    for (const progress of [undefined, NaN, Infinity, -1, 101, '50']) {
        assert.deepEqual(downloadProgress({ status: 'progress', progress }), { state: 'downloading', percent: null });
    }
    assert.deepEqual(downloadProgress({ status: 'ready' }), { state: 'ready', percent: null });
    assert.equal(downloadProgress({ status: 'evil' }), null);
});
