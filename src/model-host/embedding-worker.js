import { env, pipeline } from './transformers.js';
import { cos_sim } from '../../vendor/transformers.js';
import { EMBEDDING_MODEL_ID, EMBEDDING_MODEL_REVISION, EMBEDDING_MODEL_DTYPE, EMBEDDING_LIMITS } from '../config.js';
import { validateEmbeddingRequest, validateEmbeddingVector, validateEmbeddingScores } from '../lib/embedding-protocol.js';

env.allowLocalModels = false;
let extractor;

// The host sends one job at a time. Only this worker owns the model/WASM heap.
self.onmessage = async ({ data }) => {
    try {
        const { task, pages } = validateEmbeddingRequest(data.task, data.pages, EMBEDDING_LIMITS);
        let loadMs = 0;
        if (!extractor) {
            const start = performance.now();
            extractor = await pipeline('feature-extraction', EMBEDDING_MODEL_ID, {
                revision: EMBEDDING_MODEL_REVISION,
                dtype: EMBEDDING_MODEL_DTYPE,
                device: 'wasm',
                progress_callback: progress => self.postMessage({ id: data.id, progress }),
            });
            // v3.8.1 ignores max_length in feature-extraction call options.
            // Its tokenizer reads this value when applying truncation: true.
            extractor.tokenizer.model_max_length = Math.min(
                extractor.tokenizer.model_max_length ?? Infinity, EMBEDDING_LIMITS.tokens,
            );
            loadMs = Math.round(performance.now() - start);
        }
        const start = performance.now();
        const vectors = [];
        for (const text of [task, ...pages]) {
            const tensor = await extractor(text, { pooling: 'mean', normalize: true });
            vectors.push(validateEmbeddingVector(tensor.tolist()[0], EMBEDDING_LIMITS.dimensions));
        }
        const scores = validateEmbeddingScores(vectors.slice(1).map(vector => {
            const score = cos_sim(vectors[0], vector);
            if (!Number.isFinite(score)) throw new TypeError('Nonfinite model similarity');
            return Math.max(-1, Math.min(1, score));
        }), pages.length);
        self.postMessage({ id: data.id, scores, loadMs, inferenceMs: Math.round(performance.now() - start) });
    } catch (error) {
        self.postMessage({ id: data?.id, error: String(error).slice(0, 1000) });
    }
};
