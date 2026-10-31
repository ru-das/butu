#!/usr/bin/env python3
"""Apply the documented extension CSP patches to the pinned upstream bundles."""
from pathlib import Path

vendor = Path(__file__).resolve().parent.parent / 'vendor'
patches = {
    'transformers.js': [
        ('var fi=()=>typeof globalThis=="object"?globalThis:Function("return this")()',
         'var fi=()=>globalThis'),
        ('Qp=async e=>(await import(/*webpackIgnore:true*/e)).default',
         'Qp=async e=>{if(new URL(e,import.meta.url).href!==new URL("./ort-wasm-simd-threaded.jsep.mjs",import.meta.url).href)throw new Error("Only the bundled WASM loader is allowed");return(await import("./ort-wasm-simd-threaded.jsep.mjs")).default}'),
    ],
    'ort-wasm-simd-threaded.jsep.mjs': [
        ('var $d=()=>"object"==typeof globalThis?globalThis:Function("return this")()',
         'var $d=()=>globalThis'),
    ],
}

for name, replacements in patches.items():
    path = vendor / name
    source = path.read_text()
    for before, after in replacements:
        if source.count(before) == 1:
            source = source.replace(before, after, 1)
        elif source.count(after) != 1:
            raise SystemExit(f'{name}: pinned upstream patch no longer matches')
    path.write_text(source)
