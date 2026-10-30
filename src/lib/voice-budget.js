import { ELEVENLABS_BUDGET, ELEVENLABS_VOICE_EXPIRES_AT_MS } from '../config.js';

// Count Unicode characters conservatively as UTF-16 units (never undercount emojis).
// The caller reserves these characters BEFORE dispatch, retaining failed/uncertain calls.
export function voiceBatchBudget(lines, { spentChars = 0, availableChars = 0, batchLimit = ELEVENLABS_BUDGET.sessionChars, nowMs = Date.now() } = {}) {
    if (!Number.isFinite(nowMs) || nowMs >= ELEVENLABS_VOICE_EXPIRES_AT_MS) {
        return { allowed: false, characters: 0, reason: 'voice-expired' };
    }
    if (!Array.isArray(lines) || !lines.length || lines.some(line => typeof line !== 'string' || !line.trim() || line.length > ELEVENLABS_BUDGET.requestChars)) {
        return { allowed: false, characters: 0, reason: 'invalid-lines' };
    }
    if (![spentChars, availableChars, batchLimit].every(value => Number.isSafeInteger(value) && value >= 0)) {
        return { allowed: false, characters: 0, reason: 'invalid-budget' };
    }
    const characters = lines.reduce((total, line) => total + line.length, 0);
    const allowed = characters <= batchLimit && characters <= availableChars &&
        characters <= ELEVENLABS_BUDGET.rolling31DayChars - spentChars;
    return { allowed, characters, reason: allowed ? null : 'budget-exhausted' };
}
