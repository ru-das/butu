import { VoiceQueue } from '../voice.js';
import { FirefoxSessionLifetime } from './firefox-session-lifetime.js';

const queue = new VoiceQueue();
let expiry;
let endsAt;
function expire() {
    updateVoice({ ...queue.state, session: null, endsAt: null, stage: 0, visit: null, returned: false, tabs: {} });
}
const lifetime = location.protocol === 'moz-extension:' ? new FirefoxSessionLifetime(expire) : null;

export function updateVoice(state) {
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
    if (message?.target !== 'model-host' || message.type !== 'voice:update' ||
        sender.id !== chrome.runtime.id || sender.tab ||
        !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
    updateVoice(message.state);
    respond({ ok: true });
});
