import { TASK_MIN_CHARS, TASK_MAX_CHARS, SESSION_DURATION_PRESETS_MINUTES } from '../config.js';
import { createSession, remainingSeconds, formatCountdown } from '../lib/session.js';

const form = document.querySelector('#session-form');
const task = document.querySelector('#task');
const duration = document.querySelector('#duration');
const customDuration = document.querySelector('#custom-duration');
const minutes = document.querySelector('#minutes');
const start = document.querySelector('#start');
const active = document.querySelector('#active-session');
const countdown = document.querySelector('#countdown');
const status = document.querySelector('#status');
let session = null;
let timer;

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
        status.textContent = session ? 'Our time is up. Thank you for sitting with me!' : '';
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
    // Task 1.5 moves session ownership to the background (alarms + stop).
    chrome.storage.local.set({ session: next }, () => {
        start.disabled = false;
        if (chrome.runtime.lastError) {
            status.textContent = "I couldn't save our session. Please try again.";
            return;
        }
        session = next;
        render();
    });
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.session) return;
    session = changes.session.newValue ?? null;
    render();
});

chrome.storage.local.get('session', (stored) => {
    if (chrome.runtime.lastError) {
        status.textContent = "I couldn't read our session. Close and reopen Butu to try again.";
        return;
    }
    session = stored.session ?? null;
    render();
});
