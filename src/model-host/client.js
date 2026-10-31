// All browser-specific model routing stays in model-host/.
let host;
let creating;
let generation = 0;
async function ensureOffscreen() {
    creating ??= (async () => {
        const url = 'src/model-host/offscreen.html';
        const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [chrome.runtime.getURL(url)],
        });
        if (!contexts.length) await chrome.offscreen.createDocument({
            url, reasons: ['WORKERS', 'AUDIO_PLAYBACK'], justification: 'Run local semantic detection and bundled focus-session audio.',
        });
    })().finally(() => { creating = null; });
    return creating;
}

export async function comparePage(task, page, onProgress = () => {}) {
    const current = generation;
    if (!chrome.offscreen) {
        host ??= import('./embedding-host.js').then(({ EmbeddingHost }) => new EmbeddingHost());
        const embedding = await host;
        if (current !== generation) throw new Error('Embedding session ended');
        return embedding.compare(task, [page], onProgress);
    }
    await ensureOffscreen();
    if (current !== generation) throw new Error('Embedding session ended');
    const requestId = crypto.randomUUID();
    const progress = (message, sender) => {
        if (current === generation && message?.type === 'embedding:progress' &&
            message.requestId === requestId && sender.id === chrome.runtime.id && !sender.tab &&
            sender.url === chrome.runtime.getURL('src/model-host/offscreen.html')) onProgress(message.progress);
    };
    chrome.runtime.onMessage.addListener(progress);
    try {
        const result = await chrome.runtime.sendMessage({ target: 'model-host', type: 'embedding:compare', task, page, requestId });
        if (!result || result.error) throw new Error('Local detection unavailable');
        return result;
    } catch (error) {
        if (current === generation) onProgress({ state: 'error', percent: null });
        throw error;
    } finally {
        chrome.runtime.onMessage.removeListener(progress);
    }
}

let voiceHost;
export async function testVoiceHost(volume) {
    if (!chrome.offscreen) {
        voiceHost ??= import('./voice-host.js');
        (await voiceHost).testVoice(volume);
        return;
    }
    await ensureOffscreen();
    const result = await chrome.runtime.sendMessage({ target: 'model-host', type: 'voice:test', volume });
    if (!result?.ok) throw new Error('Voice host unavailable');
}

export async function syncVoiceHost(state) {
    if (!chrome.offscreen) {
        if (state.stage) voiceHost ??= import('./voice-host.js');
        if (voiceHost) (await voiceHost).updateVoice(state);
        return;
    }
    if (state.stage) await ensureOffscreen();
    else {
        const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
        if (!contexts.length) return;
    }
    await chrome.runtime.sendMessage({ target: 'model-host', type: 'voice:update', state });
}

// Never create a host just to clean it up. Invalidate dispatches awaiting creation.
export async function releaseSessionHost() {
    generation++;
    if (!chrome.offscreen) {
        if (host) (await host).release();
        if (voiceHost) (await voiceHost).releaseVoice();
        return;
    }
    if (creating) await creating;
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (contexts.length) await chrome.offscreen.closeDocument();
}
