import { DIARY_MAX_SESSIONS, DIARY_QUALITY } from '../config.js';

export function sessionDrawing(entry) {
    const share = entry.elapsedSeconds > 0 ? entry.offTaskSeconds / entry.elapsedSeconds : 0;
    if (share > DIARY_QUALITY.wrongAbove) return {
        file: 'butu-wrong', label: 'I tried to draw us smiling.',
        alt: 'Butu looks wrong: eyes traced over and an uneven smile',
    };
    if (share >= DIARY_QUALITY.uneasyFrom) return {
        file: 'butu-waiting', label: 'I saved your place.',
        alt: 'Butu looks uneasy, with a tilted head and paws held together',
    };
    return { file: 'butu-calm', label: 'My favourite place is beside you.',
        alt: 'Happy Butu smiling with open paws' };
}

// Storage is local, but old or manually edited entries may be incomplete.
export function diarySessions(history) {
    if (!Array.isArray(history)) return [];
    return history.filter(entry => entry && typeof entry.task === 'string' && entry.task.trim() &&
        Number.isSafeInteger(entry.startedAt) && entry.startedAt >= 0 &&
        Number.isFinite(new Date(entry.startedAt).getTime()) &&
        Number.isFinite(entry.elapsedSeconds) && entry.elapsedSeconds >= 0 &&
        Number.isFinite(entry.offTaskSeconds) && entry.offTaskSeconds >= 0 &&
        Number.isSafeInteger(entry.timesWandered) && entry.timesWandered >= 0)
        .slice(-DIARY_MAX_SESSIONS).reverse();
}

export function sessionPlaces(domains) {
    if (!Array.isArray(domains)) return [];
    return [...new Set(domains.flatMap(domain => {
        if (typeof domain !== 'string') return [];
        const host = domain.trim().toLowerCase().replace(/\.$/u, '');
        try {
            return host && new URL(`https://${host}`).hostname === host ? [host] : [];
        } catch { return []; }
    }))];
}
