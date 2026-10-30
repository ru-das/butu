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
            url, reasons: ['WORKERS'], justification: 'Run local semantic detection in a dedicated worker.',
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
