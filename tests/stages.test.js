import assert from 'node:assert/strict';
import test from 'node:test';
import { STAGE_START_SECONDS } from '../src/config.js';
import { getStage } from '../src/lib/stages.js';

test('zero and fractional grace-period durations remain at stage 0', () => {
    for (const seconds of [0, -0, Number.MIN_VALUE, 0.5]) {
        assert.equal(getStage(seconds), 0);
    }
});

test('each configured boundary enters its stage exactly, without rounding', () => {
    for (let stage = 1; stage < STAGE_START_SECONDS.length; stage++) {
        const start = STAGE_START_SECONDS[stage];
        assert.equal(getStage(start - 1), stage - 1);
        assert.equal(getStage(start - 0.001), stage - 1);
        assert.equal(getStage(start), stage);
        assert.equal(getStage(start + 0.001), stage);
    }
});

test('long off-task durations stay at the final stage', () => {
    for (const seconds of [STAGE_START_SECONDS.at(-1) + 1, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE]) {
        assert.equal(getStage(seconds), STAGE_START_SECONDS.length - 1);
    }
});

test('invalid durations are rejected without numeric coercion', () => {
    for (const seconds of [
        -1, -0.001, -Number.MIN_VALUE, NaN, Infinity, -Infinity,
        undefined, null, '', '45', true, false, {}, [], [45], 45n, Symbol('seconds'),
    ]) {
        assert.throws(() => getStage(seconds), TypeError);
    }
});
