// All browser-specific model routing stays in model-host/.
let host;
let creating;
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

export async function comparePage(task, page) {
    if (!chrome.offscreen) {
        host ??= import('./embedding-host.js').then(({ EmbeddingHost }) => new EmbeddingHost());
        return (await host).compare(task, [page]);
    }
    await ensureOffscreen();
    const result = await chrome.runtime.sendMessage({ target: 'model-host', type: 'embedding:compare', task, page });
    if (!result || result.error) throw new Error('Local detection unavailable');
    return result;
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
