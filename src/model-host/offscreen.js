import { EmbeddingHost } from './embedding-host.js';
const host = new EmbeddingHost();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.target !== 'model-host' || message.type !== 'embedding:compare' ||
        sender.id !== chrome.runtime.id || sender.tab ||
        !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
    host.compare(message.task, [message.page]).then(respond, () => respond({ error: 'Local detection unavailable' }));
    return true;
});
