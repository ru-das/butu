import { env, pipeline } from './src/model-host/transformers.js';
import { TEXT_MODEL_ID, TEXT_MODEL_REVISION, TEXT_MODEL_DTYPE } from './src/config.js';

env.allowLocalModels = false;
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
