import { FirefoxSessionLifetime } from './firefox-session-lifetime.js';
import { EmbeddingHost } from './embedding-host.js';

// Phase 0 only. No stored-session lifecycle or automatic TTS retry.
const instance = crypto.randomUUID();
const bornAt = Date.now();
const host = globalThis.phase0Host ?? new EmbeddingHost();
const audio = new Audio(chrome.runtime.getURL('assets/audio/test-chime.mp3'));
audio.volume = 0.3;
const events = [];
let endReason = null;
for (const type of ['playing', 'ended', 'pause', 'error']) {
    audio.addEventListener(type, () => {
        events.push({ type, at: Date.now(), time: audio.currentTime });
        if (events.length > 20) events.shift();
    });
}
const lifetime = new FirefoxSessionLifetime(reason => {
    endReason = reason;
    host.release();
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
});
function snapshot() {
    return { instance, bornAt, endsAt: lifetime.session?.endsAt ?? null, endReason,
        workerLoaded: host.worker !== null, cacheEntries: host.cache.size,
        audio: { paused: audio.paused, ended: audio.ended, time: audio.currentTime,
            muted: audio.muted, volume: audio.volume, events: events.slice() } };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || typeof message?.type !== 'string' || !message.type.startsWith('phase0:lifetime-')) return;
    // Check wall time on every routed request, including after sleep/delayed timers.
    if (lifetime.session && Date.now() >= lifetime.session.endsAt) lifetime.stop('expired');
    const handle = async () => {
        switch (message.type) {
        case 'phase0:lifetime-start':
            lifetime.start(message.endsAt);
            endReason = null;
            break;
        case 'phase0:lifetime-stop':
            lifetime.stop();
            break;
        case 'phase0:lifetime-audio':
            if (!lifetime.session) throw new Error('No active probe session');
            audio.pause();
            audio.currentTime = 0;
            audio.loop = message.loop === true;
            await audio.play().catch(() => {});
            break;
        case 'phase0:lifetime-compare': {
            if (!lifetime.session) throw new Error('No active probe session');
            const result = await host.compare('DBMS assignment on normalization', [message.title]);
            // Discard completion if the session ended during inference.
            if (!lifetime.session) throw new Error('Probe session ended');
            return { ...snapshot(), result };
        }
        case 'phase0:lifetime-status': break;
        default: throw new Error('Unknown lifetime probe request');
        }
        return snapshot();
    };
    handle().then(sendResponse, error => sendResponse({ error: String(error) }));
    return true;
});
