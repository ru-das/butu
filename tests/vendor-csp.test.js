import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

test('vendored runtime has no Function fallback and accepts only its bundled loader', async () => {
    const source = readFileSync(new URL('../vendor/transformers.js', import.meta.url), 'utf8');
    for (const name of ['transformers.js', 'ort-wasm-simd-threaded.jsep.mjs']) {
        assert.doesNotMatch(readFileSync(new URL(`../vendor/${name}`, import.meta.url), 'utf8'), /\bFunction\s*\(/);
    }
    // Exercise the actual vendor URL guard; replace module syntax for the VM only.
    const loader = source.match(/Qp=(async e=>\{.*?\}),Ca=/)?.[1];
    assert.ok(loader, 'patched ONNX loader exists');
    assert.ok(loader.includes('import("./ort-wasm-simd-threaded.jsep.mjs")'));
    const requested = [];
    const load = runInNewContext('(' + loader.replaceAll('import.meta.url', 'moduleUrl')
        .replace('import(', 'load(') + ')', {
        URL, moduleUrl: 'moz-extension://test/vendor/transformers.js',
        load: async path => { requested.push(path); return { default: 'bundled' }; },
    });
    assert.equal(await load('moz-extension://test/vendor/ort-wasm-simd-threaded.jsep.mjs'), 'bundled');
    for (const url of ['https://example.com/ort-wasm-simd-threaded.jsep.mjs',
        'blob:moz-extension://test/loader', './other.mjs', './ort-wasm-simd-threaded.jsep.mjs?override=1']) {
        await assert.rejects(load(url), /Only the bundled WASM loader is allowed/);
    }
    assert.deepEqual(requested, ['./ort-wasm-simd-threaded.jsep.mjs']);
});
