// Manifest content scripts are classic scripts; load the bundled ES module on demand.
(() => {
    let extractor;
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (message?.type !== 'page:extract' || sender.id !== chrome.runtime.id) return;
        if (!['http:', 'https:'].includes(location.protocol)) return;
        extractor ??= import(chrome.runtime.getURL('src/content/extract.js')).catch((error) => {
            extractor = undefined;
            throw error;
        });
        extractor.then(({ extractPageText }) => extractPageText()).then(respond, () => {
            respond({ error: 'Page text is unavailable.' });
        });
        return true;
    });
})();
