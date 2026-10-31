// Firefox runs model and audio hosts in its background page.
let host;
let voiceHost;
let generation = 0;

export async function comparePage(task, page, onProgress = () => {}) {
    const current = generation;
    host ??= import('./embedding-host.js').then(({ EmbeddingHost }) => new EmbeddingHost());
    const embedding = await host;
    if (current !== generation) throw new Error('Embedding session ended');
    return embedding.compare(task, [page], onProgress);
}

export async function testVoiceHost(volume) {
    voiceHost ??= import('./voice-host.js');
    (await voiceHost).testVoice(volume);
}

export async function syncVoiceHost(state) {
    if (state.stage) voiceHost ??= import('./voice-host.js');
    if (voiceHost) (await voiceHost).updateVoice(state);
}

export async function releaseSessionHost() {
    generation++;
    if (host) (await host).release();
    if (voiceHost) (await voiceHost).releaseVoice();
}
