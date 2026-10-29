// Phase 0 only: inference lives in the offscreen document, never this worker.
async function ensureModelHost() {
    const url = 'src/model-host/offscreen.html';
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(url)],
    });
    if (contexts.length) return;

    await chrome.offscreen.createDocument({
        url,
        reasons: ['WORKERS'],
        justification: 'Host the dedicated worker for local semantic detection.',
    });
    console.log('[phase0] Offscreen model host created; inspect offscreen.html for results.');
}

// Run on worker startup, including installation/reload. Existing hosts are reused
// after worker suspension; their module runs just once per document lifetime.
ensureModelHost().catch(error => console.error('[phase0] Offscreen FAILED:', error));
