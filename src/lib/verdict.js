import { EMBEDDING_LIMITS, ON_TASK_THRESHOLD } from '../config.js';
import { validateEmbeddingScores } from './embedding-protocol.js';
import { normalizePageText } from './page-text.js';

// Only web pages enter detection. This also excludes every browser/new-tab scheme.
export function pagePolicy(url, allowlist = [], blocklist = []) {
    let page;
    try { page = new URL(url); } catch { return { onTask: null, source: 'excluded', score: null }; }
    if (!['http:', 'https:'].includes(page.protocol)) {
        return { onTask: null, source: 'excluded', score: null };
    }
    const hostname = page.hostname.toLowerCase().replace(/\.$/u, '');
    const matches = (list) => Array.isArray(list) && list.some((domain) => {
        if (typeof domain !== 'string') return false;
        const host = domain.trim().toLowerCase().replace(/\.$/u, '');
        return host && (hostname === host || hostname.endsWith(`.${host}`));
    });
    if (matches(allowlist)) return { onTask: true, source: 'allowlist', score: null };
    if (matches(blocklist)) return { onTask: false, source: 'blocklist', score: null };
    return null;
}

export function pageEmbeddingText(page) {
    if (!page || !['title', 'description', 'mainText'].every(key => typeof page[key] === 'string')) {
        throw new TypeError('Invalid page extraction');
    }
    return normalizePageText([page.title, page.description, page.mainText]
        .map(text => text.slice(0, EMBEDDING_LIMITS.pageChars)).join(' '))
        .slice(0, EMBEDDING_LIMITS.pageChars);
}

export function scoreVerdict(score, threshold = ON_TASK_THRESHOLD) {
    validateEmbeddingScores([score], 1);
    // Never coerce the intentionally unset threshold to zero before task 2.4.
    const tuned = Number.isFinite(threshold) && threshold >= -1 && threshold <= 1;
    return { onTask: tuned ? score >= threshold : null,
        source: tuned ? 'embedding' : 'threshold-unset', score };
}

export function sessionKey(session) {
    return JSON.stringify([session?.startedAt, session?.endsAt, session?.task]);
}
