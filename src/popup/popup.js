import { TASK_MIN_CHARS, TASK_MAX_CHARS, SESSION_DURATION_PRESETS_MINUTES } from '../config.js';
import { createSession, remainingSeconds, formatCountdown } from '../lib/session.js';

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
let session = null;
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
    form.hidden = seconds > 0;
    active.hidden = seconds === 0;
    if (seconds > 0) {
        document.querySelector('#session-task').textContent = session.task;
        countdown.textContent = formatCountdown(seconds);
        status.textContent = '';
        timer = setInterval(render, 1000);
    } else {
        status.textContent = endMessage;
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
        render();
    });
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.session) return;
    if (session && !changes.session.newValue) {
        endMessage = remainingSeconds(session) > 0
            ? 'Thank you for sitting with me!'
            : 'Our time is up. Thank you for sitting with me!';
    }
    session = changes.session.newValue ?? null;
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

chrome.runtime.sendMessage({ type: 'session:get' }, (response) => {
    if (chrome.runtime.lastError || response?.error || !response) {
        status.textContent = "I couldn't read our session. Close and reopen Butu to try again.";
        return;
    }
    session = response.session;
    if (!session) endMessage = '';
    render();
});
