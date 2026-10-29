import { TASK_MIN_CHARS, TASK_MAX_CHARS } from '../config.js';

export function createSession(task, minutes, now = Date.now()) {
    const text = typeof task === 'string' ? task.trim() : '';
    if (text.length < TASK_MIN_CHARS || text.length > TASK_MAX_CHARS) {
        throw new Error(`Tell Butu your task in ${TASK_MIN_CHARS}–${TASK_MAX_CHARS} characters.`);
    }
    const endsAt = now + minutes * 60_000;
    if (!Number.isSafeInteger(minutes) || minutes < 1 ||
        !Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(endsAt)) {
        throw new Error('Choose a whole number of minutes, starting at 1.');
    }
    return { task: text, startedAt: now, endsAt };
}

export function remainingSeconds(session, now = Date.now()) {
    if (!session || typeof session.task !== 'string' ||
        session.task.trim().length < TASK_MIN_CHARS || session.task.length > TASK_MAX_CHARS ||
        !Number.isSafeInteger(session.startedAt) || session.startedAt < 0 ||
        !Number.isSafeInteger(session.endsAt) || session.endsAt <= session.startedAt) return 0;
    return Math.max(0, Math.ceil((session.endsAt - now) / 1000));
}

export function formatCountdown(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
