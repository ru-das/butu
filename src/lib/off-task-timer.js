import { ON_TASK_RESET_SECONDS } from '../config.js';

// One focused, visible tab owns the interval. Unknown/excluded pages never count.
export function updateTiming(previous, event, now) {
    const state = structuredClone(previous ?? {
        tabs: {}, activeTabId: null, onTaskSeconds: 0, updatedAt: now,
    });
    const elapsed = Math.max(0, now - state.updatedAt) / 1000;
    const active = state.tabs[state.activeTabId];
    if (event.type !== 'restart' && active?.onTask === false) {
        active.seconds += elapsed;
        state.onTaskSeconds = 0;
    } else if (event.type !== 'restart' && active?.onTask === true) {
        state.onTaskSeconds = Math.min(ON_TASK_RESET_SECONDS, state.onTaskSeconds + elapsed);
        if (state.onTaskSeconds >= ON_TASK_RESET_SECONDS) {
            for (const tab of Object.values(state.tabs)) tab.seconds = 0;
        }
    }
    state.updatedAt = Math.max(state.updatedAt, now);
    if (event.type === 'verdict' || event.type === 'activity') {
        let tab = state.tabs[event.tabId];
        if (!tab) tab = state.tabs[event.tabId] = { seconds: 0, onTask: null };
        if (tab.url !== event.url) tab.onTask = null;
        tab.url = event.url;
        tab.windowId = event.windowId;
        if (event.type === 'verdict') tab.onTask = event.onTask;
        else if (event.visible && event.focused) state.activeTabId = event.tabId;
        else if (state.activeTabId === event.tabId) state.activeTabId = null;
        if (state.activeTabId === event.tabId && tab.onTask === false) state.onTaskSeconds = 0;
    } else if (event.type === 'pause' || event.type === 'remove' || event.type === 'restart') {
        if ((event.tabId == null || state.activeTabId === event.tabId) &&
            (event.windowId == null || active?.windowId === event.windowId)) state.activeTabId = null;
        if (event.type === 'remove') delete state.tabs[event.tabId];
    }
    return state;
}
