import { diaryCaption } from '../lib/possession.js';
import { remainingSeconds, formatCountdown } from '../lib/session.js';
import { diarySessions, sessionDrawing, sessionPlaces } from '../lib/diary.js';

const caption = document.querySelector('#caption');
const current = document.querySelector('#current-session');
const pages = document.querySelector('#pages');
const empty = document.querySelector('#empty');
const status = document.querySelector('#status');
const template = document.querySelector('#session-page');

function render({ session, sessionHistory }) {
    current.hidden = !remainingSeconds(session);
    caption.textContent = current.hidden ? '' : diaryCaption(session);
    const history = diarySessions(sessionHistory);
    const fragment = document.createDocumentFragment();
    for (const entry of history) {
        const page = template.content.cloneNode(true);
        const time = page.querySelector('time');
        const date = new Date(entry.startedAt);
        time.dateTime = date.toISOString();
        time.textContent = date.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
        page.querySelector('.session-ending').textContent = entry.completed ? 'Timer finished' : 'Ended early';
        page.querySelector('.session-task').textContent = entry.task;
        page.querySelector('.session-time').textContent = formatCountdown(Math.round(entry.elapsedSeconds));
        page.querySelector('.session-wanders').textContent = String(entry.timesWandered);
        page.querySelector('.session-caption').textContent = typeof entry.caption === 'string' && entry.caption
            ? entry.caption : diaryCaption(entry);
        const domains = sessionPlaces(entry.domains);
        const places = page.querySelector('.places-list');
        for (const domain of domains) {
            const item = document.createElement('li');
            item.textContent = domain;
            places.append(item);
        }
        places.hidden = domains.length === 0;
        page.querySelector('.places-empty').hidden = domains.length > 0;
        const drawing = sessionDrawing(entry);
        const image = page.querySelector('.session-drawing');
        image.src = `../../assets/doodles/${drawing.file}.svg`;
        image.alt = drawing.alt;
        page.querySelector('figcaption').textContent = drawing.label;
        fragment.append(page);
    }
    pages.replaceChildren(fragment);
    pages.setAttribute('aria-busy', 'false');
    empty.hidden = history.length > 0;
    status.textContent = '';
}

let read = 0;
function refresh() {
    const serial = ++read;
    chrome.storage.local.get(['session', 'sessionHistory'], (data) => {
        if (serial !== read) return;
        if (chrome.runtime.lastError) {
            status.textContent = "I couldn’t read our pages. Reload the diary to try again.";
            pages.setAttribute('aria-busy', 'false');
            return;
        }
        render(data);
    });
}
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.session || changes.sessionHistory)) refresh();
});
refresh();
