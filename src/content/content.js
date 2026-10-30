// Manifest content scripts are classic scripts; load the bundled ES module on demand.
(() => {
    let extractor;
    let session;
    let interval;
    let tickMs;
    let leaving = false;
    let config;
    let root;
    let font;
    let fade;
    let currentStage = 0;
    let request = 0;
    const originals = new Map();
    const protectedSelector = 'input, textarea, select, button, form, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]';

    function editing() {
        let active = document.activeElement;
        // Closed shadow roots cannot be inspected: conservatively leave their host alone.
        while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
        return active?.closest(protectedSelector) || active?.matches('iframe') ||
            active?.isContentEditable || active?.localName.includes('-');
    }

    function restore(immediate = false) {
        currentStage = 0;
        for (const [heading, saved] of originals) {
            for (const [node, text] of saved.text) node.textContent = text;
            if (saved.attribute === null) heading.removeAttribute('data-butu-haunt-heading');
            else heading.setAttribute('data-butu-haunt-heading', saved.attribute);
        }
        originals.clear();
        if (font) { document.fonts.delete(font); font = undefined; }
        if (!immediate && root?.hasAttribute('data-butu-returning')) return;
        clearTimeout(fade);
        if (!root) return;
        if (immediate) { root.remove(); root = undefined; }
        else {
            const retiring = root;
            retiring.setAttribute('data-butu-returning', '');
            fade = setTimeout(() => {
                retiring.remove();
                if (root === retiring) root = undefined;
            }, config.RETURN_FADE_MS);
        }
    }

    function rewriteHeadings() {
        for (const heading of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
            if (originals.size >= config.STAGE_2_MAX_HEADINGS) break;
            if (heading.closest(protectedSelector) || heading.querySelector(protectedSelector) ||
                !heading.getClientRects().length || getComputedStyle(heading).visibility !== 'visible') continue;
            const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
                acceptNode: node => node.parentElement.closest('script, style, [hidden], [aria-hidden="true"]')
                    ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
            });
            const text = [];
            while (walker.nextNode()) text.push([walker.currentNode, walker.currentNode.textContent]);
            if (!text.some(([, value]) => value.trim())) continue;
            originals.set(heading, { text, attribute: heading.getAttribute('data-butu-haunt-heading') });
            text.forEach(([node], index) => { node.textContent = index ? '' : "We were going to work together… remember?"; });
            heading.setAttribute('data-butu-haunt-heading', '');
        }
    }

    function applyStage(stage) {
        if (!config || !Number.isInteger(stage) || stage < 0 || stage > 4) return;
        if (!session || Date.now() >= session.endsAt || leaving || editing() ||
            !['http:', 'https:'].includes(location.protocol)) { restore(true); return; }
        if (!stage) { if (currentStage) restore(); return; }
        if (stage === currentStage && root?.isConnected) return;
        if (stage < currentStage) restore(true);
        clearTimeout(fade);
        if (!root?.isConnected) {
            root = document.createElement('div');
            root.setAttribute('data-butu-haunt-root', '');
            root.setAttribute('aria-hidden', 'true');
            // Injected manifest CSS resolves relative URLs against the host page.
            // Supply extension URLs explicitly; no asset may fall back to a site request.
            for (const name of ['stars-calm', 'stars-corrupted', 'smiley-calm', 'smiley-corrupted',
                'heart-calm', 'heart-corrupted', 'flower-calm', 'flower-corrupted',
                'butu-waiting', 'butu-lonely', 'butu-wrong', 'butu-abandoned', 'scribble-1', 'scribble-3']) {
                root.style.setProperty(`--butu-${name}`, `url("${chrome.runtime.getURL(`assets/doodles/${name}.svg`)}")`);
            }
            root.style.setProperty('--butu-return-ms', `${config.RETURN_FADE_MS}ms`);
            for (const shape of ['stars', 'smiley', 'heart', 'flower', 'butu']) {
                const doodle = document.createElement('span');
                doodle.className = `butu-haunt-${shape}`;
                root.append(doodle);
            }
            const scribble = document.createElement('span');
            scribble.className = 'butu-haunt-scribble';
            const line = document.createElement('p');
            line.className = 'butu-haunt-line';
            line.textContent = "I'm still here. We have work to do together.";
            root.append(scribble, line);
            document.documentElement.append(root);
        }
        if (!font) {
            // A return interrupted by another off-task visit reuses the fading overlay.
            font = new FontFace('Butu Haunt Hand', `url("${chrome.runtime.getURL('assets/fonts/patrick-hand/PatrickHand-Regular.ttf')}")`);
            document.fonts.add(font);
            void font.load().catch(() => {});
        }
        root.removeAttribute('data-butu-returning');
        root.setAttribute('data-butu-stage', String(stage));
        if (stage >= 2 && !originals.size) rewriteHeadings();
        currentStage = stage;
    }
    function reportTiming() {
        if (!session || Date.now() >= session.endsAt) {
            restore();
            clearInterval(interval);
            interval = undefined;
            return;
        }
        const url = location.href;
        const serial = ++request;
        chrome.runtime.sendMessage({ type: 'timing:activity', url,
            visible: !leaving && document.visibilityState === 'visible' }, result => {
            // A navigation or extension reload may close the message channel.
            const error = chrome.runtime.lastError;
            if (!error && serial === request && url === location.href && result?.url === url) applyStage(result.stage);
        });
    }
    function refreshTiming() {
        clearInterval(interval);
        reportTiming();
        if (tickMs && !leaving && document.visibilityState === 'visible' &&
            session && Date.now() < session.endsAt) interval = setInterval(reportTiming, tickMs);
    }
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.offTaskTiming) {
            const timing = changes.offTaskTiming.newValue;
            if (!timing || timing.tabs?.[timing.activeTabId]?.onTask === true ||
                !Object.values(timing.tabs ?? {}).some(tab => tab.seconds > 0)) { request++; restore(); }
        }
        if (area === 'local' && changes.session) {
            request++;
            restore(true);
            session = changes.session.newValue;
            refreshTiming();
        }
    });
    chrome.storage.local.get('session', result => {
        session = result.session;
        refreshTiming();
    });
    import(chrome.runtime.getURL('src/config.js')).then(settings => {
        config = settings;
        tickMs = config.TIMING_TICK_MS;
        refreshTiming();
    }).catch(() => {});
    document.addEventListener('visibilitychange', refreshTiming);
    document.addEventListener('focusin', () => { if (editing()) { request++; restore(true); } });
    document.addEventListener('focusout', () => { queueMicrotask(refreshTiming); });
    window.addEventListener('focus', refreshTiming);
    window.addEventListener('blur', refreshTiming);
    window.addEventListener('pagehide', () => { leaving = true; request++; restore(true); refreshTiming(); });
    window.addEventListener('pageshow', () => { leaving = false; refreshTiming(); });
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (message?.type === 'timing:poll' && sender.id === chrome.runtime.id) {
            refreshTiming();
            respond({});
            return;
        }
        if (message?.type !== 'page:extract' || sender.id !== chrome.runtime.id) return;
        if (!['http:', 'https:'].includes(location.protocol)) return;
        // Detection must see the site's text, never Butu's placeholders.
        restore(true);
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
