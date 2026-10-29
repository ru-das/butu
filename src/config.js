// Phase 0 uses the WASM-compatible MHA ONNX export of SmolLM2-135M-Instruct.
export const TEXT_MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX-MHA';
export const TEXT_MODEL_REVISION = '5b6682c7c9df18f004bfb7e635cba3f3d98537d8';
export const TEXT_MODEL_DTYPE = 'q8';
// One short rewrite; longer Phase 0 runs generated repeated trailing text.
export const TEXT_MAX_NEW_TOKENS = 25;

export const EMBEDDING_MODEL_ID = 'Xenova/paraphrase-MiniLM-L3-v2';
export const EMBEDDING_MODEL_REVISION = 'f2d931077e6527467d9ffc873f647d835e589e82';
export const EMBEDDING_MODEL_DTYPE = 'q8';

// Pinned alternatives retained for reproducible browser comparisons.
export const CANDIDATE_TEXT_MODEL = {
    id: 'Xenova/flan-t5-small',
    revision: '311454e83bc784267fd7eef5940ee854144abbec',
    dtype: 'q8',
    task: 'text2text-generation',
};
export const CANDIDATE_EMBEDDING_MODEL = {
    id: 'Xenova/paraphrase-MiniLM-L3-v2',
    revision: 'f2d931077e6527467d9ffc873f647d835e589e82',
    dtype: 'q8',
};
export const CANDIDATE_TEXT_MODEL_Q8 = {
    id: TEXT_MODEL_ID,
    revision: TEXT_MODEL_REVISION,
    dtype: 'q8',
    task: 'text-generation',
};

// Keep the original Phase 0 comparison reproducible after changing defaults.
export const BASELINE_TEXT_MODEL = {
    id: TEXT_MODEL_ID,
    revision: TEXT_MODEL_REVISION,
    dtype: 'q4',
    task: 'text-generation',
};
export const BASELINE_EMBEDDING_MODEL = {
    id: 'Xenova/all-MiniLM-L6-v2',
    revision: '751bff37182d3f1213fa05d7196b954e230abad9',
    dtype: 'q8',
};
