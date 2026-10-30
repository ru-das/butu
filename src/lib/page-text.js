// Collapse page whitespace before measuring the sample, not afterwards.
export function normalizePageText(text) {
    return text.replace(/\s+/gu, ' ').trim();
}
