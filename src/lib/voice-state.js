import { DEFAULT_MUTED, DEFAULT_VOLUME } from '../config.js';
import { getStage } from './stages.js';
import { sessionKey } from './verdict.js';
import { remainingSeconds } from './session.js';

// Only the timing owner can make sound. URLs stay local and never enter audio files.
export function voiceState({ session, offTaskTiming, volume, muted }, now = Date.now()) {
    const key = session && sessionKey(session);
    const live = remainingSeconds(session, now) > 0;
    const timing = live && offTaskTiming?.sessionKey === key ? offTaskTiming : null;
    const tab = timing?.tabs?.[timing.activeTabId];
    return {
        session: live ? key : null,
        endsAt: live ? session.endsAt : null,
        tabs: timing?.tabs ?? {},
        visit: tab ? JSON.stringify([timing.activeTabId, tab.visit ?? 0, tab.url]) : null,
        stage: tab?.onTask === false && Number.isFinite(tab.seconds) && tab.seconds >= 0 ? getStage(tab.seconds) : 0,
        returned: tab?.onTask === true,
        volume: (typeof muted === 'boolean' ? muted : DEFAULT_MUTED) ? 0 :
            (Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULT_VOLUME),
    };
}
