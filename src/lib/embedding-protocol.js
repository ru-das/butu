// Pure validation shared by the document and its inference worker.
export function validateEmbeddingRequest(task, pages, limits) {
    if (typeof task !== 'string' || task.length > limits.taskChars || !task.trim()) {
        throw new TypeError('Invalid embedding task');
    }
    if (!Array.isArray(pages) || pages.length < 1 || pages.length > limits.pages ||
        Array.from(pages).some(page => typeof page !== 'string' || page.length > limits.pageChars || !page.trim())) {
        throw new TypeError('Invalid embedding pages');
    }
    return { task: task.trim(), pages: pages.map(page => page.trim()) };
}

export function validateEmbeddingVector(vector, dimensions) {
    if (!Array.isArray(vector) || vector.length !== dimensions ||
        !Array.from(vector).every(Number.isFinite) || !vector.some(value => value !== 0)) {
        throw new TypeError('Invalid model embedding');
    }
    return vector;
}

export function validateEmbeddingScores(scores, count) {
    if (!Array.isArray(scores) || scores.length !== count ||
        !Array.from(scores).every(score => Number.isFinite(score) && score >= -1 && score <= 1)) {
        throw new TypeError('Invalid model similarity scores');
    }
    return scores.slice();
}
