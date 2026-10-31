import { sessionPlaces } from './diary.js';

export function parseDomains(text) {
    const lines = text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
    for (const line of lines) {
        if (line.includes('*') || sessionPlaces([line]).length !== 1) {
            throw new TypeError(`Use a domain like example.com, without a URL or path: ${line}`);
        }
    }
    return sessionPlaces(lines);
}
