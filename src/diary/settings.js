import { DEFAULT_VOLUME, DEFAULT_MUTED } from '../config.js';
import { parseDomains } from '../lib/settings.js';
import { sessionPlaces } from '../lib/diary.js';

const form = document.querySelector('#settings');
const fields = document.querySelector('#settings-fields');
const status = document.querySelector('#settings-status');
const volume = document.querySelector('#volume');
const muted = document.querySelector('#muted');
const lists = ['allowlist', 'blocklist'].map(id => document.getElementById(id));
const test = document.querySelector('#test-voice');
const showVolume = () => {
    document.querySelector('#volume-value').textContent = `${volume.value}%`;
};
volume.addEventListener('input', showVolume);
for (const list of lists) list.addEventListener('input', () => list.setCustomValidity(''));

chrome.storage.local.get(['allowlist', 'blocklist', 'volume', 'muted'], data => {
    if (chrome.runtime.lastError) {
        status.textContent = 'I couldn’t read your settings. Reload this page to try again.';
        return;
    }
    for (const list of lists) list.value = sessionPlaces(data[list.id]).join('\n');
    volume.value = Math.round((Number.isFinite(data.volume)
        ? Math.max(0, Math.min(1, data.volume)) : DEFAULT_VOLUME) * 100);
    muted.checked = typeof data.muted === 'boolean' ? data.muted : DEFAULT_MUTED;
    showVolume();
    fields.disabled = false;
    status.textContent = '';
});

form.addEventListener('submit', event => {
    event.preventDefault();
    const settings = { volume: Number(volume.value) / 100, muted: muted.checked };
    for (const list of lists) {
        try { settings[list.id] = parseDomains(list.value); }
        catch (error) {
            list.setCustomValidity(error.message);
            list.reportValidity();
            return;
        }
    }
    fields.disabled = true;
    chrome.storage.local.set(settings, () => {
        const error = chrome.runtime.lastError;
        fields.disabled = false;
        if (error) {
            status.textContent = 'I couldn’t save your settings. Please try saving again.';
            return;
        }
        for (const list of lists) list.value = settings[list.id].join('\n');
        status.textContent = 'Your settings are saved.';
    });
});

test.addEventListener('click', () => {
    test.disabled = true;
    chrome.runtime.sendMessage({ type: 'voice:test' }, result => {
        const error = chrome.runtime.lastError;
        test.disabled = false;
        status.textContent = error || !result?.ok ? 'I couldn’t start the voice test. Please try again.'
            : result.muted ? 'Butu is quiet. Unmute and raise the volume, then save to hear the test.'
                : 'Voice test requested. “Hello, little star. Shall we begin?”';
    });
});
