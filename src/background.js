import { createSession, remainingSeconds } from './lib/session.js';

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
    await storage('set', { session: null });
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
        await storage('set', { session });
        try {
            await chrome.alarms.create(SESSION_ALARM, { when: session.endsAt });
        } catch (error) {
            await endSession();
            throw error;
        }
        return session;
    }).then((session) => respond({ session }), () => {
        respond({ error: "I couldn't update our session. Please try again." });
    });
    return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SESSION_ALARM) recover();
});
chrome.runtime.onStartup.addListener(recover);
chrome.runtime.onInstalled.addListener(recover);

function recover() {
    return enqueue(reconcile).catch(() => {
        console.error('Butu could not restore the session timer.');
    });
}

// Also runs whenever a suspended service worker/event page wakes.
recover();
