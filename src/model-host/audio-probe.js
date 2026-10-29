// Phase 0 only: one bundled clip, one player, no model or page interaction.
const audio = new Audio(chrome.runtime.getURL('assets/audio/test-chime.mp3'));
audio.volume = 0.3;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'phase0:play-audio') return;
    // Chrome's service worker recreates/routes to this host; Firefox receives directly.
    if (location.pathname.endsWith('/offscreen.html') && message.target !== 'model-host') return;
    audio.pause();
    audio.currentTime = 0;
    audio.play().then(
        () => sendResponse({ playing: true }),
        () => sendResponse({ playing: false }),
    );
    return true;
});
