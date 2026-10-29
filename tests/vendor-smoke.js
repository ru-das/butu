// Real ONNX inference using an embedded operator: no model download or user data.
import { env } from '../src/model-host/transformers.js';
import { Tensor, matmul } from '../vendor/transformers.js';

const result = document.querySelector('#result');
const resources = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, ...options) => {
    resources.push(new URL(input instanceof Request ? input.url : input, location.href).href);
    return originalFetch(input, ...options);
};
try {
    const expectedPath = new URL('../vendor/', import.meta.url).href;
    if (env.backends.onnx.wasm.wasmPaths !== expectedPath ||
        env.backends.onnx.wasm.numThreads !== 1 ||
        env.backends.onnx.wasm.proxy !== false) {
        throw new Error('Unexpected WASM configuration');
    }
    const output = await matmul(
        new Tensor('float32', [2, 3], [1, 2]),
        new Tensor('float32', [4, 5], [2, 1]),
    );
    if (output.data[0] !== 23) throw new Error(`Expected 23, got ${output.data[0]}`);
    const wasm = resources.filter(url => url.endsWith('.wasm'));
    if (!wasm.includes(`${expectedPath}ort-wasm-simd-threaded.jsep.wasm`) ||
        resources.some(url => !url.startsWith(new URL('../', import.meta.url).href))) {
        throw new Error(`Unexpected resources: ${resources.join(', ')}`);
    }
    result.textContent = `PASS: Transformers.js ${env.version}; ONNX matmul = 23.\n${resources.join('\n')}`;
} catch (error) {
    result.textContent = `FAIL: ${error.stack ?? error}`;
    console.error(error);
} finally {
    globalThis.fetch = originalFetch;
}
