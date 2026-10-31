import { TASK_MIN_CHARS, TASK_MAX_CHARS, SESSION_DURATION_PRESETS_MINUTES } from '../config.js';
import { sessionKey } from '../lib/verdict.js';
import { createSession, remainingSeconds, formatCountdown } from '../lib/session.js';
import { popupSummaryLine } from '../lib/possession.js';

const form = document.querySelector('#session-form');
const task = document.querySelector('#task');
const duration = document.querySelector('#duration');
const customDuration = document.querySelector('#custom-duration');
const minutes = document.querySelector('#minutes');
const start = document.querySelector('#start');
const stop = document.querySelector('#stop');
const active = document.querySelector('#active-session');
const countdown = document.querySelector('#countdown');
const status = document.querySelector('#status');
const summary = document.querySelector('#session-summary');
const again = document.querySelector('#again');
let session = null;
let latest = null;
let modelDownload = null;
let showForm = false;
let timer;
let endMessage = "Our time is up. Thank you for sitting with me!";

task.minLength = TASK_MIN_CHARS;
task.maxLength = TASK_MAX_CHARS;
for (const value of SESSION_DURATION_PRESETS_MINUTES) {
    duration.add(new Option(`${value} minutes`, String(value)));
}
duration.add(new Option('Custom…', 'custom'));
duration.addEventListener('change', () => {
    const custom = duration.value === 'custom';
    customDuration.hidden = !custom;
    minutes.disabled = !custom;
    minutes.required = custom;
    if (custom) minutes.focus();
});

function render() {
    clearInterval(timer);
    const seconds = remainingSeconds(session);
    if (session && !seconds) {
        countdown.textContent = '00:00';
        status.textContent = 'Saving our time together…';
        readSession();
        return;
    }
    const showSummary = !seconds && latest && !showForm;
    form.hidden = seconds > 0 || showSummary;
    active.hidden = seconds === 0;
    summary.hidden = !showSummary;
    document.querySelector('header h1').hidden = !!showSummary || seconds > 0;
    if (showSummary) {
        document.querySelector('#summary-task').textContent = latest.task;
        document.querySelector('#summary-time').textContent = formatCountdown(Math.round(latest.elapsedSeconds));
        document.querySelector('#summary-wanders').textContent = String(latest.timesWandered);
        document.querySelector('#summary-waited').textContent = (latest.offTaskSeconds / 60).toLocaleString(undefined,
            { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        document.querySelector('#summary-line').textContent = popupSummaryLine(latest);
    }
    const downloading = document.querySelector('#model-download');
    downloading.hidden = !(seconds > 0 && modelDownload?.sessionKey === sessionKey(session) && modelDownload.state !== 'ready');
    if (!downloading.hidden) {
        const failed = modelDownload.state === 'error';
        document.querySelector('#download-heading').textContent = failed ? "Butu couldn't wake up." : 'Butu is waking up…';
        const progress = document.querySelector('#download-progress');
        progress.hidden = failed;
        if (modelDownload.percent === null) progress.removeAttribute('value');
        else progress.value = modelDownload.percent;
        document.querySelector('#download-detail').textContent = failed
            ? 'Check your connection, then stop and start our session to try again. Page checking is paused.'
            : modelDownload.state === 'downloading'
                ? `Downloading${modelDownload.percent === null ? '…' : `… ${modelDownload.percent}% of this file`}`
                : 'Getting the local page checker ready…';
    }
    if (seconds > 0) {
        document.querySelector('#session-task').textContent = session.task;
        countdown.textContent = formatCountdown(seconds);
        status.textContent = '';
        timer = setInterval(render, 1000);
    } else {
        status.textContent = showSummary ? '' : endMessage;
    }
}

form.addEventListener('submit', (event) => {
    event.preventDefault();
    let next;
    try {
        next = createSession(task.value, Number(duration.value === 'custom' ? minutes.value : duration.value));
    } catch (error) {
        status.textContent = error.message;
        return;
    }
    start.disabled = true;
    status.textContent = 'Saving our time together…';
    chrome.runtime.sendMessage({
        type: 'session:start', task: next.task,
        minutes: Number(duration.value === 'custom' ? minutes.value : duration.value),
    }, (response) => {
        start.disabled = false;
        if (chrome.runtime.lastError || response?.error || !response?.session) {
            status.textContent = response?.error ?? "I couldn't start our session. Please try again.";
            return;
        }
        session = response.session;
        showForm = false;
        render();
    });
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.session && !changes.sessionHistory && !changes.modelDownload) return;
    if (session && changes.session && !changes.session.newValue) {
        endMessage = remainingSeconds(session) > 0
            ? 'Thank you for sitting with me!'
            : 'Our time is up. Thank you for sitting with me!';
    }
    if (changes.modelDownload) modelDownload = changes.modelDownload.newValue ?? null;
    if (changes.session) session = changes.session.newValue ?? null;
    if (changes.sessionHistory) {
        latest = changes.sessionHistory.newValue?.at(-1) ?? null;
        showForm = false;
    }
    render();
});

stop.addEventListener('click', () => {
    stop.disabled = true;
    chrome.runtime.sendMessage({ type: 'session:stop' }, (response) => {
        stop.disabled = false;
        if (chrome.runtime.lastError || response?.error || !response) {
            status.textContent = response?.error ?? "I couldn't stop our session. Please try again.";
            return;
        }
        endMessage = 'Thank you for sitting with me!';
        session = response.session;
        render();
    });
});

again.addEventListener('click', () => {
    showForm = true;
    endMessage = '';
    render();
    task.focus();
});

function readSession() {
    chrome.runtime.sendMessage({ type: 'session:get' }, (response) => {
        if (chrome.runtime.lastError || response?.error || !response) {
            status.textContent = "I couldn't read our session. Close and reopen Butu to try again.";
            return;
        }
        chrome.storage.local.get(['session', 'sessionHistory', 'modelDownload'], (data) => {
            if (chrome.runtime.lastError) {
                status.textContent = "I couldn't read our session. Close and reopen Butu to try again.";
                return;
            }
            modelDownload = data.modelDownload ?? null;
            session = data.session ?? null;
            latest = data.sessionHistory?.at(-1) ?? null;
            if (!session) endMessage = '';
            render();
        });
    });
}

readSession();
