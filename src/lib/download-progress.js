// Downloader events are untrusted; never pass filenames, URLs or arbitrary copy to UI.
export function downloadProgress(event) {
    if (event?.status === 'ready') return { state: 'ready', percent: null };
    if (event?.status === 'progress') return { state: 'downloading', percent:
        Number.isFinite(event.progress) && event.progress >= 0 && event.progress <= 100
            ? Math.floor(event.progress) : null };
    if (['initiate', 'download', 'done'].includes(event?.status)) return { state: 'loading', percent: null };
    return null;
}
