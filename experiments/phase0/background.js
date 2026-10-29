import { env, pipeline } from './src/model-host/transformers.js';
import { TEXT_MODEL_ID, TEXT_MODEL_REVISION, TEXT_MODEL_DTYPE } from './src/config.js';
import { EMBEDDING_MODEL_ID, EMBEDDING_MODEL_REVISION, EMBEDDING_MODEL_DTYPE } from './src/config.js';
import { cos_sim } from './vendor/transformers.js';

env.allowLocalModels = false;
const task = 'DBMS assignment on normalization';
const comparisons = [
    'Third normal form explained',
    'Functional dependencies tutorial',
    'IPL cricket highlights',
];

let extractor;
try {
    console.log('[phase0] Loading embeddings', EMBEDDING_MODEL_ID, EMBEDDING_MODEL_DTYPE);
    const loadStart = performance.now();
    extractor = await pipeline('feature-extraction', EMBEDDING_MODEL_ID, {
        revision: EMBEDDING_MODEL_REVISION,
        dtype: EMBEDDING_MODEL_DTYPE,
        device: 'wasm',
    });
    console.log('[phase0] Embedding model load ms:', Math.round(performance.now() - loadStart));
    const start = performance.now();
    const vectors = (await extractor([task, ...comparisons], {
        pooling: 'mean', normalize: true,
    })).tolist();
    console.log('[phase0] Embedding ms:', Math.round(performance.now() - start));
    console.log('[phase0] Task:', task);
    const scores = comparisons.map((text, i) => {
        const score = cos_sim(vectors[0], vectors[i + 1]);
        console.log('[phase0] Cosine similarity:', text, score);
        return score;
    });
    if (!scores.every(Number.isFinite) || scores[0] <= scores[2] || scores[1] <= scores[2]) {
        throw new Error('Expected both DBMS titles to score higher than cricket');
    }
    console.log('[phase0] Embedding ranking PASS');
} catch (error) {
    console.error('[phase0] Embeddings FAILED:', error);
} finally {
    // Never keep both models loaded on the 4 GB target machine.
    if (extractor) await extractor.dispose();
    extractor = null;
}

const prompt = 'Rewrite as a sad little ghost would say it: Breaking news about cricket';

// Keep a reference for the manual memory check; removal unloads the experiment.
let generator;
try {
    console.log('[phase0] Loading', TEXT_MODEL_ID, TEXT_MODEL_DTYPE);
    const loadStart = performance.now();
    generator = await pipeline('text-generation', TEXT_MODEL_ID, {
        revision: TEXT_MODEL_REVISION,
        dtype: TEXT_MODEL_DTYPE,
        device: 'wasm',
        progress_callback: event => {
            if (event.status !== 'progress') console.log('[phase0] Model', event);
        },
    });
    console.log('[phase0] Model load ms:', Math.round(performance.now() - loadStart));

    const start = performance.now();
    const result = await generator([{ role: 'user', content: prompt }], {
        max_new_tokens: 48,
        do_sample: false,
        return_full_text: false,
    });
    const generationMs = Math.round(performance.now() - start);
    const raw = result[0]?.generated_text?.at(-1)?.content;
    console.log('[phase0] Raw output:', raw);
    const line = typeof raw === 'string' ? raw.trim().split(/\r?\n/)[0] : '';
    console.log('[phase0] Output:', line || 'Oh… cricket news, and nobody here to hear it with me.');
    console.log('[phase0] Generation ms:', generationMs);
} catch (error) {
    console.error('[phase0] FAILED:', error);
}
