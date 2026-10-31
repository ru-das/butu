import { VoiceQueue } from '../voice.js';
import { FirefoxSessionLifetime } from './firefox-session-lifetime.js';
import { VOICE_PREVIEW_CLIP } from '../config.js';

let preview;
function stopPreview() {
    if (!preview) return;
    preview.onended = preview.onerror = null;
    preview.pause();
    preview.removeAttribute('src');
    preview.load();
    preview = null;
}

export function testVoice(volume) {
    stopPreview();
    if (!Number.isFinite(volume) || volume <= 0 || volume > 1) return;
    try {
        const audio = new Audio(chrome.runtime.getURL(`assets/audio/${VOICE_PREVIEW_CLIP}.mp3`));
        preview = audio;
        audio.volume = volume;
        const finish = () => { if (preview === audio) stopPreview(); };
        audio.onended = audio.onerror = finish;
        void audio.play().catch(finish);
    } catch { stopPreview(); } // Autoplay/device failures stay silent.
}

const queue = new VoiceQueue();
let expiry;
let endsAt;
function expire() {
    updateVoice({ ...queue.state, session: null, endsAt: null, stage: 0, visit: null, returned: false, tabs: {} });
}
const lifetime = location.protocol === 'moz-extension:' ? new FirefoxSessionLifetime(expire) : null;

export function updateVoice(state) {
    if (preview) {
        if (!state.volume) stopPreview();
        else preview.volume = state.volume;
    }
    queue.update(state);
    if (endsAt === state.endsAt) return;
    endsAt = state.endsAt;
    clearTimeout(expiry);
    if (endsAt) {
        expiry = setTimeout(expire, Math.max(0, endsAt - Date.now()));
        lifetime?.start(endsAt);
    } else lifetime?.stop();
}

// Offscreen documents expose runtime messaging, not storage. The background
// derives state from its trusted timer; content scripts cannot command playback.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.target !== 'model-host' || !['voice:update', 'voice:test'].includes(message.type) ||
        sender.id !== chrome.runtime.id || sender.tab ||
        !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
    if (message.type === 'voice:test') testVoice(message.volume);
    else updateVoice(message.state);
    respond({ ok: true });
});
