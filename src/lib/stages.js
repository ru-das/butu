import { STAGE_START_SECONDS } from '../config.js';

// Stage entry is inclusive. Accept fractional seconds, reject invalid durations.
export function getStage(offTaskSeconds) {
    if (!Number.isFinite(offTaskSeconds) || offTaskSeconds < 0) {
        throw new TypeError('Expected finite, nonnegative off-task seconds');
    }

    for (let stage = STAGE_START_SECONDS.length - 1; stage > 0; stage--) {
        if (offTaskSeconds >= STAGE_START_SECONDS[stage]) return stage;
    }
    return 0;
}
