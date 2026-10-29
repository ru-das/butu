// Model hosts must import this module before creating any pipelines.
import { env, pipeline } from '../../vendor/transformers.js';

// Resolve against this module, never a CDN or the current web page.
env.backends.onnx.wasm.wasmPaths = new URL('../../vendor/', import.meta.url).href;
// No SharedArrayBuffer/cross-origin isolation or proxy worker required.
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;

export { env, pipeline };
