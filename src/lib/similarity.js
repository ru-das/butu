// Cosine for finite, nonzero numeric arrays (including typed arrays).
// Invalid embeddings throw rather than silently becoming a relevance verdict.
export function cosineSimilarity(a, b) {
    const isVector = vector => (Array.isArray(vector) || ArrayBuffer.isView(vector)) && vector.length > 0;
    if (!isVector(a) || !isVector(b) || a.length !== b.length) {
        throw new TypeError('Expected nonempty vectors of equal length');
    }

    let scaleA = 0;
    let scaleB = 0;
    for (let i = 0; i < a.length; i++) {
        if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) {
            throw new TypeError('Expected finite vector components');
        }
        scaleA = Math.max(scaleA, Math.abs(a[i]));
        scaleB = Math.max(scaleB, Math.abs(b[i]));
    }
    if (scaleA === 0 || scaleB === 0) throw new TypeError('Cosine is undefined for zero vectors');

    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        // Scaling preserves direction and avoids overflow/underflow when squaring.
        const x = a[i] / scaleA;
        const y = b[i] / scaleB;
        dot += x * y;
        normA += x * x;
        normB += y * y;
    }
    return Math.max(-1, Math.min(1, dot / Math.sqrt(normA) / Math.sqrt(normB)));
}
