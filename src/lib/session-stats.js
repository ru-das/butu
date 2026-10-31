import { DIARY_MAX_SESSIONS } from '../config.js';
import { diaryCaption } from './possession.js';
import { updateTiming } from './off-task-timer.js';
import { sessionKey } from './verdict.js';

export function saveSession(history, session, timing, now = Date.now()) {
    if (!session || typeof session.task !== 'string' || !session.task.trim() ||
        !Number.isSafeInteger(session.startedAt) || !Number.isSafeInteger(session.endsAt) ||
        session.startedAt < 0 || session.endsAt <= session.startedAt) return history;
    const endedAt = Math.max(session.startedAt, Math.min(now, session.endsAt));
    const totals = timing?.sessionKey === sessionKey(session)
        ? updateTiming(timing, { type: 'pause' }, endedAt).stats : null;
    const elapsedSeconds = (endedAt - session.startedAt) / 1000;
    const entry = {
        ...session, endedAt, elapsedSeconds, completed: endedAt === session.endsAt,
        offTaskSeconds: Math.min(elapsedSeconds, totals?.offTaskSeconds ?? 0),
        timesWandered: totals?.timesWandered ?? 0,
        domains: totals?.domains ?? [],
        caption: diaryCaption(session),
    };
    return [...(Array.isArray(history) ? history : []), entry].slice(-DIARY_MAX_SESSIONS);
}
