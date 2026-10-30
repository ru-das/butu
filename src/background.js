import { createSession, remainingSeconds } from './lib/session.js';
import { EMBEDDING_LIMITS } from './config.js';
import { pagePolicy, pageEmbeddingText, scoreVerdict, sessionKey } from './lib/verdict.js';
import { comparePage } from './model-host/client.js';
import { updateTiming } from './lib/off-task-timer.js';
import { getStage } from './lib/stages.js';

const SESSION_ALARM = 'butu-session-end';
let pending = Promise.resolve();

// Serialize popup commands and alarm delivery so an old end cannot erase a new start.
function enqueue(action) {
    const result = pending.then(action);
    pending = result.catch(() => {});
    return result;
}

function storage(method, value) {
    return new Promise((resolve, reject) => {
        chrome.storage.local[method](value, (result) => {
            const error = chrome.runtime.lastError;
            if (error) reject(new Error(error.message));
            else resolve(result);
        });
    });
}

function clearAlarm() {
    return new Promise((resolve, reject) => {
        chrome.alarms.clear(SESSION_ALARM, () => {
            const error = chrome.runtime.lastError;
            if (error) reject(new Error(error.message));
            else resolve();
        });
    });
}

async function endSession() {
    // Clear persisted state first: a leftover alarm is harmless after a restart.
    await storage('set', { session: null, verdictCache: null, offTaskTiming: null });
    await clearAlarm();
    return null;
}

async function reconcile() {
    const { session } = await storage('get', 'session');
    if (!remainingSeconds(session)) {
        if (session != null) return endSession();
        await clearAlarm();
        return null;
    }
    // Recreate alarms from the deadline; browsers may discard alarms on restart.
    await chrome.alarms.create(SESSION_ALARM, { when: session.endsAt });
    return session;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === 'timing:activity') {
        if (sender.id !== chrome.runtime.id || sender.frameId !== 0 ||
            !Number.isInteger(sender.tab?.id) || pagePolicy(sender.url)?.source === 'excluded' ||
            message.url !== sender.url || typeof message.visible !== 'boolean') return;
        const now = Date.now();
        enqueue(async () => {
            const tab = await tabCall('get', sender.tab.id);
            if (tab.url !== message.url || tab.pendingUrl && tab.pendingUrl !== tab.url) return;
            const window = await new Promise((resolve, reject) => {
                chrome.windows.get(tab.windowId, result => {
                    const error = chrome.runtime.lastError;
                    if (error) reject(new Error(error.message));
                    else resolve(result);
                });
            });
            const timing = await recordTiming({ type: 'activity', tabId: tab.id, windowId: tab.windowId,
                url: tab.url, visible: message.visible && tab.active, focused: window.focused }, now);
            const entry = timing?.tabs[tab.id];
            const working = timing?.tabs[timing.activeTabId]?.onTask === true;
            return { url: tab.url, stage: !working && entry?.onTask === false ? getStage(entry.seconds) : 0 };
        }).then(result => respond(result ?? {}), () => respond({}));
        return true;
    }
    if (!['session:start', 'session:stop', 'session:get'].includes(message?.type)) return;
    // Only extension views may control sessions; content scripts are not callers.
    if (sender.id !== chrome.runtime.id ||
        !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
    enqueue(async () => {
        if (message.type === 'session:stop') return endSession();
        const current = await reconcile();
        if (message.type === 'session:get' || current) return current;
        const session = createSession(message.task, message.minutes);
        // Persist before scheduling; recovery can restore the alarm if interrupted.
        await storage('set', { session, verdictCache: null, offTaskTiming: null });
        try {
            await chrome.alarms.create(SESSION_ALARM, { when: session.endsAt });
        } catch (error) {
            await endSession();
            throw error;
        }
        return session;
    }).then((session) => {
        respond({ session });
        if (message.type === 'session:start' && session) evaluateActiveTabs();
    }, () => {
        respond({ error: "I couldn't update our session. Please try again." });
    });
    return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SESSION_ALARM) recover();
});
chrome.runtime.onStartup.addListener(() => {
    void enqueue(() => recordTiming({ type: 'restart' }, Date.now())).catch(() => {});
    recover();
});
chrome.runtime.onInstalled.addListener(() => {
    void enqueue(() => recordTiming({ type: 'restart' }, Date.now())).catch(() => {});
    recover();
});

function recover() {
    return enqueue(reconcile).catch(() => {
        console.error('Butu could not restore the session timer.');
    });
}

// Also runs whenever a suspended service worker/event page wakes.
recover();

const evaluating = new Map();

// Call only through enqueue: timing and session changes share the same storage queue.
async function recordTiming(event, now = Date.now()) {
    const { session, offTaskTiming } = await storage('get', ['session', 'offTaskTiming']);
    if (!remainingSeconds(session)) return;
    const key = sessionKey(session);
    const previous = offTaskTiming?.sessionKey === key ? offTaskTiming : null;
    const next = updateTiming(previous, event, Math.min(now, session.endsAt));
    await storage('set', { offTaskTiming: { ...next, sessionKey: key } });
    return next;
}

function pauseTiming(event) {
    const now = Date.now();
    void enqueue(() => recordTiming(event, now)).catch(() => {});
}

// Callback APIs work in both browsers; tab URLs are available via existing host permissions.
function tabCall(method, ...args) {
    return new Promise((resolve, reject) => {
        chrome.tabs[method](...args, (result) => {
            const error = chrome.runtime.lastError;
            if (error) reject(new Error(error.message));
            else resolve(result);
        });
    });
}

async function evaluateTab(tabId) {
    let url;
    try {
        const tab = await tabCall('get', tabId);
        url = tab.url;
        // Exclusions precede settings, extraction, cache lookup and model loading.
        if (pagePolicy(url)?.source === 'excluded') return;
        if (tab.pendingUrl && tab.pendingUrl !== url) return;
        const { session, allowlist, blocklist, verdictCache } = await storage('get',
            ['session', 'allowlist', 'blocklist', 'verdictCache']);
        if (!remainingSeconds(session)) return;
        const key = sessionKey(session);
        const workKey = JSON.stringify([key, tabId, url]);
        if (evaluating.has(workKey) || evaluating.size >= EMBEDDING_LIMITS.pending) return;
        const work = (async () => {
            let verdict = pagePolicy(url, allowlist, blocklist);
            let cached = false;
            if (!verdict) {
                const entry = verdictCache?.sessionKey === key &&
                    verdictCache.entries?.find(entry => entry.url === url);
                if (entry) {
                    verdict = scoreVerdict(entry.score);
                    cached = true;
                } else {
                    const page = await tabCall('sendMessage', tabId, { type: 'page:extract' }, { frameId: 0 });
                    if (page?.url !== url) return;
                    const text = pageEmbeddingText(page);
                    if (!text) throw new Error('Empty page text');
                    const result = await comparePage(session.task, text);
                    if (!Array.isArray(result.scores) || result.scores.length !== 1) throw new Error('Invalid scores');
                    verdict = scoreVerdict(result.scores[0]);
                }
            }
            await enqueue(async () => {
                const current = await storage('get', ['session', 'allowlist', 'blocklist', 'verdictCache']);
                if (!remainingSeconds(current.session) || sessionKey(current.session) !== key) return;
                const latest = await tabCall('get', tabId);
                if (latest.url !== url || latest.pendingUrl && latest.pendingUrl !== url) return;
                // Settings may have changed during inference; overrides always win.
                const override = pagePolicy(url, current.allowlist, current.blocklist);
                if (override) verdict = override;
                else if (verdict.score === null) return;
                if (verdict.score !== null && !cached) {
                    const entries = current.verdictCache?.sessionKey === key
                        ? current.verdictCache.entries.filter(entry => entry.url !== url) : [];
                    entries.push({ url, score: verdict.score });
                    await storage('set', { verdictCache: { sessionKey: key,
                        entries: entries.slice(-EMBEDDING_LIMITS.cacheEntries) } });
                }
                console.log('[Butu verdict]', { url, ...verdict, cached });
                await recordTiming({ type: 'verdict', tabId, windowId: latest.windowId,
                    url, onTask: verdict.onTask });
                // Also starts timing when a session begins on an already-open page.
                void tabCall('sendMessage', tabId, { type: 'timing:poll' }, { frameId: 0 }).catch(() => {});
            });
        })();
        evaluating.set(workKey, work);
        try { await work; } finally { evaluating.delete(workKey); }
    } catch {
        pauseTiming({ type: 'pause', tabId });
        // A closed/restricted tab, failed extraction or model error never means off task.
        console.log('[Butu verdict]', { url, onTask: null, score: null, source: 'unavailable', cached: false });
    }
}

async function evaluateActiveTabs() {
    try {
        const tabs = await tabCall('query', { active: true });
        for (const tab of tabs) void evaluateTab(tab.id);
    } catch { /* Browser shutdown or missing host access. */ }
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
    pauseTiming({ type: 'pause', windowId });
    void evaluateTab(tabId);
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
    if (change.url || change.status === 'loading') pauseTiming({ type: 'pause', tabId });
    // URL changes include same-document SPA navigation; complete covers fresh documents.
    if (change.url || change.status === 'complete') void evaluateTab(tabId);
});
chrome.tabs.onRemoved.addListener(tabId => pauseTiming({ type: 'remove', tabId }));
chrome.windows.onFocusChanged.addListener(() => {
    pauseTiming({ type: 'pause' });
    void evaluateActiveTabs();
});
