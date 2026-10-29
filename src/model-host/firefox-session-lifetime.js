import { FIREFOX_HEARTBEAT_MS } from '../config.js';

// Firefox only. Parent API activity resets event-page idle; timers alone do not.
// Browser termination/sleep still require the caller to restore stored state.
export class FirefoxSessionLifetime {
    constructor(onEnd, runtime = chrome.runtime) {
        this.onEnd = onEnd;
        this.runtime = runtime;
        this.session = null;
        this.heartbeat = null;
        this.expiry = null;
    }

    start(endsAt) {
        const remaining = endsAt - Date.now();
        if (!Number.isFinite(endsAt) || remaining <= 0 || remaining > 2_147_483_647) {
            throw new RangeError('Session end must be a future timestamp within the timer range');
        }
        this.stop('replaced');
        const session = this.session = { endsAt };
        const pulse = () => {
            if (this.session !== session) return;
            if (Date.now() >= endsAt) return this.stop('expired');
            try {
                Promise.resolve(this.runtime.getPlatformInfo()).catch(() => {
                    if (this.session === session) this.stop('heartbeat-failed');
                });
            } catch {
                this.stop('heartbeat-failed');
            }
        };
        this.heartbeat = setInterval(pulse, FIREFOX_HEARTBEAT_MS);
        this.expiry = setTimeout(() => this.stop('expired'), remaining);
        pulse();
    }

    stop(reason = 'stopped') {
        clearInterval(this.heartbeat);
        clearTimeout(this.expiry);
        this.heartbeat = this.expiry = null;
        if (!this.session) return;
        this.session = null;
        this.onEnd(reason);
    }
}
