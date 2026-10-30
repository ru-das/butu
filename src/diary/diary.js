import { diaryCaption } from '../lib/possession.js';
import { remainingSeconds } from '../lib/session.js';

const caption = document.querySelector('#caption');
function render(session) {
    caption.hidden = !remainingSeconds(session);
    caption.textContent = caption.hidden ? '' : diaryCaption(session);
    if (!caption.hidden) console.info('Butu text', { source: 'template', kind: 'diary' });
}

let read = 0;
function refresh() {
    const serial = ++read;
    chrome.storage.local.get('session', ({ session }) => { if (serial === read) render(session); });
}
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.session) refresh();
});
refresh();
