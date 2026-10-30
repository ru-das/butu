import { AUDIO_CROSSFADE_MS, RETURN_FADE_MS } from './config.js';

const MUSIC = ['stage-1-in-tune', 'stage-2-slower', 'stage-3-detuned', 'stage-4-winding-down'];
// The supplied companion voice only; no API calls or mixing with premade voices.
const WHISPERS = { 2: 'butu-06', 3: 'butu-08', 4: 'butu-12' };

// Construct only in the model host. Gain automation uses the audio clock, even
// when no visible extension page exists. Native media decoding stays bounded.
export class VoiceQueue {
    constructor() {
        this.context = null;
        this.players = new Set();
        this.visits = new Map();
        this.state = {};
        this.queue = [];
        this.music = this.spoken = null;
    }

    ramp(player, volume, ms) {
        const now = this.context.currentTime;
        const gain = player.gain.gain;
        // Firefox does not implement cancelAndHoldAtTime in all supported builds.
        if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
        else {
            const value = player.ramp ? player.ramp.from + (player.ramp.to - player.ramp.from) *
                Math.min(1, Math.max(0, (now - player.ramp.at) / player.ramp.duration)) : gain.value;
            gain.cancelScheduledValues(now);
            gain.setValueAtTime(value, now);
        }
        const from = gain.value;
        gain.linearRampToValueAtTime(volume, now + ms / 1000);
        player.ramp = { from, to: volume, at: now, duration: ms / 1000 };
    }

    dispose(player) {
        clearTimeout(player.timer);
        player.audio.onended = player.audio.onerror = null;
        player.audio.pause();
        player.audio.removeAttribute('src');
        player.audio.load();
        player.source.disconnect();
        player.gain.disconnect();
        this.players.delete(player);
    }

    fade(player, ms) {
        if (!player || player.retiring || !this.players.has(player)) return;
        player.retiring = true;
        this.ramp(player, 0, ms);
        player.timer = setTimeout(() => this.dispose(player), ms);
    }

    play(path, loop, volume, fadeMs = 0, done = () => {}) {
        try {
            this.context ??= new AudioContext();
            const audio = new Audio(chrome.runtime.getURL(`assets/audio/${path}.mp3`));
            const source = this.context.createMediaElementSource(audio);
            const gain = this.context.createGain();
            source.connect(gain).connect(this.context.destination);
            gain.gain.value = fadeMs ? 0 : volume;
            audio.loop = loop;
            const player = { audio, source, gain };
            this.players.add(player);
            const finish = () => {
                if (!this.players.has(player) || player.retiring) return;
                this.dispose(player);
                done();
            };
            audio.onended = audio.onerror = finish;
            // A pending play can resolve after a return; disposal cancels its source.
            this.context.resume().then(async () => {
                if (!this.players.has(player) || player.retiring) return;
                await audio.play();
                if (fadeMs && this.players.has(player) && !player.retiring) {
                    // A slow decoder/device must still fade in when it becomes audible.
                    gain.gain.cancelScheduledValues(this.context.currentTime);
                    gain.gain.setValueAtTime(0, this.context.currentTime);
                    player.ramp = null;
                    this.ramp(player, this.state.volume, fadeMs);
                }
            }).catch(finish);
            return player;
        } catch { return null; } // Autoplay/device failures never break a focus session.
    }

    pump() {
        if (this.spoken || !this.queue.length || !this.state.volume) return;
        this.spoken = this.play(this.queue.shift(), false, this.state.volume, 0, () => {
            this.spoken = null;
            this.pump();
        });
        if (!this.spoken) this.queue = [];
    }

    update(next) {
        const old = this.state;
        const changed = old.session !== next.session || old.visit !== next.visit || old.stage !== next.stage ||
            Boolean(old.volume) !== Boolean(next.volume);
        this.state = next;
        if (old.session !== next.session) {
            this.visits.clear();
            this.awaitingReturn = false;
        }
        if (next.stage) this.awaitingReturn = true;
        const chime = next.returned && this.awaitingReturn;
        if (next.returned) this.awaitingReturn = false;
        // Keep at most one current visit per open tab, rather than a browsing log.
        for (const [id] of this.visits) if (!next.tabs[id]) this.visits.delete(id);
        if (old.volume !== next.volume) {
            for (const player of this.players) if (!player.retiring) this.ramp(player, next.volume, AUDIO_CROSSFADE_MS);
        }
        if (!changed && !chime) return;
        this.queue = [];
        clearTimeout(this.queueTimer);
        this.fade(this.spoken, RETURN_FADE_MS);
        this.spoken = null;
        this.fade(this.music, next.stage ? AUDIO_CROSSFADE_MS : RETURN_FADE_MS);
        this.music = null;
        if (next.session && next.stage && next.volume) {
            this.music = this.play(`music-box/${MUSIC[next.stage - 1]}`, next.stage < 4,
                next.volume, AUDIO_CROSSFADE_MS);
            const [id] = JSON.parse(next.visit);
            let visit = this.visits.get(id);
            if (visit?.key !== next.visit) {
                visit = { key: next.visit, played: new Set() };
                this.visits.set(id, visit);
            }
            const whisper = WHISPERS[next.stage];
            if (whisper && !visit.played.has(whisper)) {
                visit.played.add(whisper); // Reserve before play; blocked clips never retry.
                if (next.stage === 3) this.queue.push('sfx/crayon-scribbling');
                this.queue.push(`voice/${whisper}`);
            }
            // Let the previous whisper fade before the next one starts.
            clearTimeout(this.queueTimer);
            this.queueTimer = setTimeout(() => this.pump(), old.stage ? RETURN_FADE_MS : 0);
        } else if (chime && next.volume) {
            this.spoken = this.play('sfx/happy-return-chime', false, next.volume, 0, () => { this.spoken = null; });
        }
        if (!next.session) {
            clearTimeout(this.queueTimer);
            // Faded players release themselves; close the audio device afterwards.
            clearTimeout(this.closeTimer);
            this.closeTimer = setTimeout(() => {
                if (!this.state.session && this.context) {
                    void this.context.close().catch(() => {});
                    this.context = null;
                }
            }, RETURN_FADE_MS + 50);
        }
    }
}
