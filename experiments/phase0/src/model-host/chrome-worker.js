// Phase 0 only: inference lives in the offscreen document, never this worker.
let creating;
function ensureModelHost() {
    if (!creating) creating = createModelHost().finally(() => { creating = null; });
    return creating;
}

async function createModelHost() {
    const url = 'src/model-host/offscreen.html';
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(url)],
    });
    if (contexts.length) return;

    await chrome.offscreen.createDocument({
        url,
        reasons: ['WORKERS', 'AUDIO_PLAYBACK'],
        justification: 'Host local semantic detection and play bundled audio away from the active page.',
    });
    console.log('[phase0] Offscreen model host created; inspect offscreen.html for results.');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'phase0:play-audio' || message.target === 'model-host') return;
    ensureModelHost()
        .then(() => chrome.runtime.sendMessage({ type: 'phase0:play-audio', target: 'model-host' }))
        .then(sendResponse, () => sendResponse({ playing: false }));
    return true;
});

// Run on worker startup, including installation/reload. Existing hosts are reused
// after worker suspension; their module runs just once per document lifetime.
ensureModelHost().catch(error => console.error('[phase0] Offscreen FAILED:', error));
