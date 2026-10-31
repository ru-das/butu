// Source-checkout dispatcher; build.sh selects only the target browser's client.
const client = await (chrome.offscreen ? import('./client-chrome.js') : import('./client-firefox.js'));
export const { comparePage, testVoiceHost, syncVoiceHost, releaseSessionHost } = client;
