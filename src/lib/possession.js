import { TAUNTS, STAGE4_LINES, DIARY_CAPTIONS } from '../templates.js';
import { formatTemplate } from './templates.js';

// Stable choices across restores, reloads and revisits, without retaining URLs.
function choose(pack, key) {
    let hash = 2166136261;
    for (let index = 0; index < key.length; index++) {
        hash = Math.imul(hash ^ key.charCodeAt(index), 16777619) >>> 0;
    }
    return pack[hash % pack.length];
}

function sessionSeed(session) {
    return JSON.stringify([session?.startedAt, session?.endsAt, session?.task]);
}

export function possessionTemplates(session, url) {
    const key = JSON.stringify([sessionSeed(session), url]);
    return { taunt: choose(TAUNTS, key), stage4: choose(STAGE4_LINES, key) };
}

export function diaryCaption(session) {
    return formatTemplate(choose(DIARY_CAPTIONS, sessionSeed(session)), { task: session?.task });
}
