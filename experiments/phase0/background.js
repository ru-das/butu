import { EmbeddingHost } from './src/model-host/embedding-host.js';
import { EMBEDDING_MODEL_ID, EMBEDDING_MODEL_DTYPE, EMBEDDING_LIMITS } from './src/config.js';
import { TAUNTS, STAGE4_LINES } from './src/templates.js';
import { formatTemplate } from './src/lib/templates.js';

// Phase 0 proof only. Real tab/session routing remains later plan work.
const task = 'DBMS assignment on normalization';
const comparisons = ['Third normal form explained', 'Functional dependencies tutorial', 'IPL cricket highlights'];
const host = new EmbeddingHost();
globalThis.phase0Host = host;

async function run() {
    try {
        console.log('[phase0] Required open model:', EMBEDDING_MODEL_ID, EMBEDDING_MODEL_DTYPE);
        const result = await host.compare(task, comparisons);
        console.log('[phase0] Embedding model load ms:', result.loadMs);
        console.log('[phase0] Embedding ms:', result.inferenceMs);
        console.log('[phase0] Task:', task);
        comparisons.forEach((title, i) => console.log('[phase0] Cosine similarity:', title, result.scores[i]));
        if (result.scores[0] <= result.scores[2] || result.scores[1] <= result.scores[2]) {
            throw new Error('Expected both DBMS titles to score higher than cricket');
        }
        console.log('[phase0] Embedding ranking PASS');
        const templates = [...TAUNTS, ...STAGE4_LINES].map(template => formatTemplate(template, { task, heading: comparisons[2] }));
        templates.forEach(line => console.log('[phase0] Template:', line));
        const cached = await host.compare(task, comparisons);
        if (!cached.cached) throw new Error('Score cache missed an identical request');
        console.log('[phase0] Score cache PASS');
        await new Promise(resolve => setTimeout(resolve, EMBEDDING_LIMITS.idleMs + 100));
        if (host.worker !== null) throw new Error('Idle worker was not terminated');
        const afterIdle = await host.compare(task, comparisons);
        if (!afterIdle.cached || host.worker !== null) throw new Error('Cached scores restarted the worker');
        console.log('[phase0] Idle teardown PASS');
        host.release();
        if (host.cache.size !== 0 || host.worker !== null) throw new Error('Session release retained state');
        globalThis.phase0Result = { passed: true, scores: result.scores, modelLoadMs: result.loadMs,
            inferenceMs: result.inferenceMs, templates, cacheHit: true, idleTeardown: true, released: true,
            rendererBudgetBytes: EMBEDDING_LIMITS.rendererBudgetBytes };
        console.log('[phase0] Result:', JSON.stringify(globalThis.phase0Result));
    } catch (error) {
        globalThis.phase0Result = { passed: false, error: String(error) };
        console.error('[phase0] FAILED:', error);
    } finally {
        host.release();
    }
}

globalThis.phase0Done = run();
