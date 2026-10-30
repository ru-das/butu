// Manifest content scripts are classic scripts; load the bundled ES module on demand.
(() => {
    let extractor;
    let session;
    let interval;
    let tickMs;
    let leaving = false;
    function reportTiming() {
        if (!session || Date.now() >= session.endsAt) {
            clearInterval(interval);
            interval = undefined;
            return;
        }
        chrome.runtime.sendMessage({ type: 'timing:activity', url: location.href,
            visible: !leaving && document.visibilityState === 'visible' }, () => {
            // A navigation or extension reload may close the message channel.
            void chrome.runtime.lastError;
        });
    }
    function refreshTiming() {
        clearInterval(interval);
        reportTiming();
        if (tickMs && !leaving && document.visibilityState === 'visible' &&
            session && Date.now() < session.endsAt) interval = setInterval(reportTiming, tickMs);
    }
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.session) {
            session = changes.session.newValue;
            refreshTiming();
        }
    });
    chrome.storage.local.get('session', result => {
        session = result.session;
        refreshTiming();
    });
    import(chrome.runtime.getURL('src/config.js')).then(({ TIMING_TICK_MS }) => {
        tickMs = TIMING_TICK_MS;
        refreshTiming();
    }).catch(() => {});
    document.addEventListener('visibilitychange', refreshTiming);
    window.addEventListener('focus', refreshTiming);
    window.addEventListener('blur', refreshTiming);
    window.addEventListener('pagehide', () => { leaving = true; refreshTiming(); });
    window.addEventListener('pageshow', () => { leaving = false; refreshTiming(); });
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (message?.type === 'timing:poll' && sender.id === chrome.runtime.id) {
            refreshTiming();
            respond({});
            return;
        }
        if (message?.type !== 'page:extract' || sender.id !== chrome.runtime.id) return;
        if (!['http:', 'https:'].includes(location.protocol)) return;
        extractor ??= import(chrome.runtime.getURL('src/content/extract.js')).catch((error) => {
            extractor = undefined;
            throw error;
        });
        extractor.then(({ extractPageText }) => ({ ...extractPageText(), url: location.href })).then(respond, () => {
            respond({ error: 'Page text is unavailable.' });
        });
        return true;
    });
})();
