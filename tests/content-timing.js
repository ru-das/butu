let checks = 0;
function equal(actual, expected) {
    checks++;
    if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
}
const originalNow = Date.now;
const originalSetInterval = window.setInterval;
const originalClearInterval = window.clearInterval;
try {
    let now = 1000;
    let visibility = 'visible';
    let changed;
    let listener;
    let tick;
    const messages = [];
    Date.now = () => now;
    window.setInterval = callback => { tick = callback; return 1; };
    window.clearInterval = () => { tick = undefined; };
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
    window.chrome = {
        runtime: {
            id: 'bear', getURL: path => new URL(`../${path}`, location.href).href,
            onMessage: { addListener: fn => { listener = fn; } },
            sendMessage: (message, cb) => { messages.push(message); cb(); },
        },
        storage: {
            local: { get: (key, cb) => cb({}) },
            onChanged: { addListener: fn => { changed = fn; } },
        },
    };
    await import('../src/content/content.js');
    // Wait for the config module imported by the classic content script.
    await new Promise(resolve => setTimeout(resolve, 100));
    equal(messages.length, 0);
    changed({ session: { newValue: { startedAt: now, endsAt: now + 120000 } } }, 'local');
    equal(messages.at(-1).visible, true);
    equal(typeof tick, 'function');
    tick();
    equal(messages.at(-1).type, 'timing:activity');
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    equal(messages.at(-1).visible, false);
    equal(tick, undefined);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    equal(messages.at(-1).visible, true);
    window.dispatchEvent(new Event('pagehide'));
    equal(messages.at(-1).visible, false);
    equal(tick, undefined);
    window.dispatchEvent(new Event('pageshow'));
    equal(messages.at(-1).visible, true);
    equal(typeof tick, 'function');
    listener({ type: 'timing:poll' }, { id: 'bear' }, () => {});
    equal(messages.at(-1).url, location.href);
    now += 120000;
    const count = messages.length;
    tick();
    equal(tick, undefined);
    equal(messages.length, count);
    changed({ session: { newValue: null } }, 'local');
    equal(messages.length, count);
    document.querySelector('#result').textContent = `PASS: ${checks} content timing checks`;
} catch (error) {
    document.querySelector('#result').textContent = `FAIL: ${error.stack}`;
} finally {
    Date.now = originalNow;
    window.setInterval = originalSetInterval;
    window.clearInterval = originalClearInterval;
    delete document.visibilityState;
}
