import assert from 'node:assert/strict';
import test from 'node:test';
import { cosineSimilarity } from '../src/lib/similarity.js';

test('cosine matches known directions and is independent of magnitude', () => {
    for (const [a, b, expected] of [
        [[1, 0], [1, 0], 1],
        [[1, 0], [0, 1], 0],
        [[1, 0], [-1, 0], -1],
        [[1, 2, 3], [2, 4, 6], 1],
        [[1, 2, 3], [-2, -4, -6], -1],
        [[1, 0], [1, 1], Math.SQRT1_2],
        [[1, 2], [3, 4], 11 / Math.sqrt(125)],
    ]) {
        assert.ok(Math.abs(cosineSimilarity(a, b) - expected) < 1e-12);
        assert.ok(Math.abs(cosineSimilarity(a, b) - cosineSimilarity(b, a)) < 1e-12);
    }
});

test('typed embeddings are accepted and inputs are unchanged', () => {
    const a = new Float32Array([1, 2, 3]);
    const b = Object.freeze([3, 2, 1]);
    assert.ok(Math.abs(cosineSimilarity(a, b) - 5 / 7) < 1e-12);
    assert.deepEqual([...a], [1, 2, 3]);
    assert.deepEqual(b, [3, 2, 1]);
    assert.equal(cosineSimilarity(new Float64Array([1]), new Float64Array([-2])), -1);
});

test('finite extreme magnitudes remain finite and scores stay in range', () => {
    for (const scale of [Number.MAX_VALUE, Number.MIN_VALUE, 1]) {
        const score = cosineSimilarity([scale, scale, scale], [scale, scale, scale]);
        assert.ok(Number.isFinite(score) && score >= -1 && score <= 1);
        assert.ok(Math.abs(score - 1) < 1e-12);
    }
    assert.equal(cosineSimilarity([Number.MAX_VALUE, 0], [Number.MIN_VALUE, 0]), 1);
});

test('invalid shapes, nonnumeric components and zero vectors are rejected on either side', () => {
    for (const invalid of [
        null, undefined, '12', 12, {}, { 0: 1, 1: 2, length: 2 },
        new DataView(new ArrayBuffer(8)), [], [1], [1, 2, 3],
        [0, 0], [-0, 0], new Float32Array(2),
        [NaN, 1], [Infinity, 1], [-Infinity, 1], ['1', 2],
        [null, 2], [undefined, 2], [true, 2], [1n, 2n], Array(2), [1, ,],
    ]) {
        assert.throws(() => cosineSimilarity(invalid, [1, 2]), TypeError);
        assert.throws(() => cosineSimilarity([1, 2], invalid), TypeError);
    }
});
