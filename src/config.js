// The only active model: local semantic detection.
export const EMBEDDING_MODEL_ID = 'Xenova/paraphrase-MiniLM-L3-v2';
// Pin the measured model weights for reproducible detection.
export const EMBEDDING_MODEL_REVISION = 'f2d931077e6527467d9ffc873f647d835e589e82';
// Quantized CPU weights keep the runtime model small.
export const EMBEDDING_MODEL_DTYPE = 'q8';
export const EMBEDDING_LIMITS = {
    // Maximum task length accepted by the embedding worker.
    taskChars: 200,
    // Bound the combined title, description and main-text input.
    pageChars: 1024,
    // Maximum page strings per queued request; inferred individually.
    pages: 3,
    // Maximum tokens in each individual model call.
    tokens: 128,
    // Expected MiniLM-L3 output vector size for validation.
    dimensions: 384,
    // Maximum pending jobs; the host runs one job at a time.
    pending: 4,
    // Maximum cached similarity scores in the embedding host.
    cacheEntries: 64,
    // Release the model worker after five idle seconds.
    idleMs: 5000,
    // Abort a model job that exceeds two minutes.
    timeoutMs: 120000,
    // Verification target, not a browser-enforced whole-process-group limit.
    rendererBudgetBytes: 500_000_000,
};
export const TEMPLATE_LIMITS = {
    // Bound task text interpolated into authored copy.
    taskChars: EMBEDDING_LIMITS.taskChars,
    // Bound page headings interpolated into authored copy.
    headingChars: 160,
    // Reject oversized authored templates before interpolation.
    templateChars: 400,
};

// Minimum required task length in the session form (F1).
export const TASK_MIN_CHARS = 3;
// Maximum required task length in the session form (F1).
export const TASK_MAX_CHARS = EMBEDDING_LIMITS.taskChars;
// Preset session lengths; the picker also accepts custom minutes.
export const SESSION_DURATION_PRESETS_MINUTES = [25, 45, 60];
// Visible main text sampled in addition to title and meta description (F2).
export const PAGE_MAIN_TEXT_CHARS = 500;
// Unset until real-page MiniLM-L3 threshold tuning in task 2.4; not a numeric default.
export const ON_TASK_THRESHOLD = null;
// Continuous on-task time required to reset per-tab off-task timers (F3).
export const ON_TASK_RESET_SECONDS = 60;
// Off-task stage entry times; stage 0 is the grace period (F4).
export const STAGE_START_SECONDS = [0, 15, 45, 90, 180];
// Minimum number of real headings rewritten at stage 2 (F4).
export const STAGE_2_MIN_HEADINGS = 1;
// Maximum number of real headings rewritten at stage 2 (F4).
export const STAGE_2_MAX_HEADINGS = 2;
// Fade visuals and audio on return before fully restoring the page.
export const RETURN_FADE_MS = 2000;
// Retain only the most recent diary sessions locally (F8).
export const DIARY_MAX_SESSIONS = 50;

// Filled with the chosen ElevenLabs Voice Design ID in task V1.
export const ELEVENLABS_VOICE_ID = null;
// Minimum number of generic voiced lines bundled by task V4 (F7).
export const BASE_WHISPER_MIN_LINES = 15;
// Maximum number of generic voiced lines bundled by task V4 (F7).
export const BASE_WHISPER_MAX_LINES = 20;
// Minimum personalised lines prepared once at session start (F7).
export const PERSONALISED_VOICE_MIN_LINES = 4;
// Maximum personalised lines prepared once at session start (F7).
export const PERSONALISED_VOICE_MAX_LINES = 5;
// A whisper may play only once in each page visit (F7).
export const WHISPER_PLAYS_PER_VISIT = 1;
// Ambient sound starts enabled unless the user has muted it (F7).
export const DEFAULT_MUTED = false;
// Unset until the low playback volume is selected with the bundled audio in V5.
export const DEFAULT_VOLUME = null;
// Unset until stage transitions can be auditioned with the bundled audio in V5.
export const AUDIO_CROSSFADE_MS = null;

// Firefox event-page heartbeat, active only during a focus session.
export const FIREFOX_HEARTBEAT_MS = 20_000;

// Historical benchmarks only. Normal extension entry points never load these.
export const TEXT_MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX-MHA';
// Pin the archived SmolLM2 benchmark weights.
export const TEXT_MODEL_REVISION = '5b6682c7c9df18f004bfb7e635cba3f3d98537d8';
// Quantization used by the archived text benchmark.
export const TEXT_MODEL_DTYPE = 'q8';
// One short rewrite; longer Phase 0 runs generated repeated trailing text.
export const TEXT_MAX_NEW_TOKENS = 25;

// Pinned alternatives retained for reproducible browser comparisons.
export const CANDIDATE_TEXT_MODEL = {
    // Archived encoder-decoder model candidate.
    id: 'Xenova/flan-t5-small',
    // Pin the archived candidate weights.
    revision: '311454e83bc784267fd7eef5940ee854144abbec',
    // Candidate quantization for the comparison.
    dtype: 'q8',
    // Transformers.js pipeline used only by the benchmark.
    task: 'text2text-generation',
};
export const CANDIDATE_EMBEDDING_MODEL = {
    // The selected candidate is now the active embedding model.
    id: EMBEDDING_MODEL_ID,
    // Reuse its pinned weights in comparisons.
    revision: EMBEDDING_MODEL_REVISION,
    // Reuse its measured quantization in comparisons.
    dtype: EMBEDDING_MODEL_DTYPE,
};
export const CANDIDATE_TEXT_MODEL_Q8 = {
    // Archived SmolLM2 candidate, never loaded by normal entry points.
    id: TEXT_MODEL_ID,
    // Reuse the archived model revision.
    revision: TEXT_MODEL_REVISION,
    // Reuse the archived q8 quantization.
    dtype: TEXT_MODEL_DTYPE,
    // Transformers.js pipeline used only by the benchmark.
    task: 'text-generation',
};

// Keep the original Phase 0 comparison reproducible after changing defaults.
export const BASELINE_TEXT_MODEL = {
    // Original Phase 0 text model.
    id: TEXT_MODEL_ID,
    // Reuse the archived model revision.
    revision: TEXT_MODEL_REVISION,
    // Original baseline used q4 rather than q8.
    dtype: 'q4',
    // Transformers.js pipeline used only by the benchmark.
    task: 'text-generation',
};
export const BASELINE_EMBEDDING_MODEL = {
    // Original larger embedding model, retained only for comparison.
    id: 'Xenova/all-MiniLM-L6-v2',
    // Pin the original baseline weights.
    revision: '751bff37182d3f1213fa05d7196b954e230abad9',
    // Original baseline embedding quantization.
    dtype: 'q8',
};
