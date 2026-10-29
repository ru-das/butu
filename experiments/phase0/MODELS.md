# Model comparison — 2026-10-29

**Historical selection, superseded:** the user subsequently approved removing
runtime text generation. Current normal entry points use MiniLM-L3 only and
authored templates. See [LOW-MEMORY.md](LOW-MEMORY.md). The comparisons below remain
available explicitly as research tooling.

Selected defaults, pinned in `src/config.js`:

- Embeddings: **Xenova/paraphrase-MiniLM-L3-v2, q8**, revision
  `f2d931077e6527467d9ffc873f647d835e589e82`.
- Generation: **onnx-community/SmolLM2-135M-Instruct-ONNX-MHA, q8**, retaining
  revision `5b6682c7c9df18f004bfb7e635cba3f3d98537d8` and the 25-token cap.

Both were tested in Chrome for Testing 153.0.8010.12 and Firefox 154.0.1, then
checked again through the normal extension entry points. **The 500 MB peak target
is still unmet. Generated character copy is still not ready for product use.**
This follows up task 0.4; no later task has been checked off.

## Comparison protocol

The benchmark uses the existing vendored Transformers.js/ORT WASM, one thread,
no proxy worker and the same pinned revisions in both browsers. Browser processes
ran sequentially. Every model was disposed; worker trials then terminated the
worker and waited 30 seconds. Memory sampling/checkpoint methods are described in
[MEMORY.md](MEMORY.md). Trials are individual observations under memory pressure
with some swap, not controlled performance guarantees or cache verification.

`model-fixtures.js` supplies three tasks with three related and three unrelated
titles each, plus six generation prompts: the original ghost prompt, a direct
task reminder, three task-bearing few-shot rewrites, and a constrained paraphrase.
Embedding success requires every related title to outrank every unrelated title
within each task. Text runtime success only requires nonempty output; it does
**not** imply that the prose passed a character/task-preservation review.

## Embeddings

| Model, q8 | Chrome largest observed renderer HWM | Firefox largest observed renderer HWM | Relevance fixtures |
| --- | ---: | ---: | --- |
| MiniLM-L6 baseline | 386 MiB | Earlier baseline only | 3/3 passed in Chrome |
| paraphrase-MiniLM-L3-v2 | 366 MiB | 327 MiB | 3/3 passed in both browsers |

The original DBMS ranking also passed in both browsers with identical scores:

| Title | L3 cosine similarity |
| --- | ---: |
| Third normal form explained | 0.3529235600470277 |
| Functional dependencies tutorial | 0.24824938937600233 |
| IPL cricket highlights | 0.14501849837195224 |

L3's observed memory benefit is modest in the same expanded Chrome fixtures.
Its quantized weight file is about 17.5 MB rather than L6's roughly 23 MB.
The fixtures establish no obvious short-text ranking regression, not production
accuracy. Task 2.4 must establish a threshold using the new model; old L6 scores
cannot be reused as if the models had the same score distribution. Longer page
inputs also remain to be tested during detection work.

## Generation

| Model/format | Chrome quality-suite observed HWM | Firefox quality-suite observed HWM | Generation range across six prompts |
| --- | ---: | ---: | --- |
| SmolLM2 MHA q4 baseline | 1,188 MiB | Earlier baseline only | Chrome 13.7–16.5 s |
| FLAN-T5-small q8 | 586 MiB | 527 MiB | Chrome 0.39–0.94 s; Firefox 0.40–1.04 s |
| SmolLM2 MHA q8 | 805 MiB | 789 MiB | Chrome 2.72–5.46 s; Firefox 3.16–6.34 s |

The FLAN-T5 export uses a quantized encoder and merged decoder totalling about
95 MB, but it failed the character/task tests. Representative exact outputs:

- Direct DBMS reminder: `a teddy bear is a teddy bear`
- Few-shot cover-letter rewrite: `a teddy bear is a good idea`
- Biology rewrite: it copied the maths-homework example and then continued into
  the fixture labels instead of producing the requested line.

These outputs matched across browsers. FLAN-T5 is not selected just because it
is smaller and faster. It uses `text2text-generation`; the benchmark supports
that string-input/string-output format without changing the default pipeline.

SmolLM2 q8 is selected for lower resource cost while retaining the existing model
family and pipeline. For this particular export, the q8 `model_quantized.onnx`
file is about **137 MB**, smaller than q4's approximately **182 MB**; the bit-count
label alone does not rank actual export size or runtime memory. See the
[export's file list](https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX-MHA/tree/5b6682c7c9df18f004bfb7e635cba3f3d98537d8/onnx).

This is not a text-quality improvement or release approval. Both SmolLM2 formats
were weak on the representative prompts: task loss, wrong-example copying and
truncated/meta responses remain. Q8's original ghost test even echoes the prompt:
`Rewrite as a sad little ghost would say: Breaking news about cricket.`
That is unsuitable product copy. The validation/template fallback in task 3.7 is
still required; the phase-zero console logs are runtime evidence, not validated
haunting text. The first-line outputs matched between Chrome and Firefox for all
six q8 comparison prompts.

## Normal extension checks with the selected pair

These use the ordinary `background.js`, with L3 disposed before q8 SmolLM2 loads;
the generator stays referenced for the original manual memory measurement.

| Measurement | Chrome | Firefox |
| --- | ---: | ---: |
| Embedding load | 11,731 ms | 1,657 ms |
| Original four-string embedding inference | 43 ms | 60 ms |
| Text-model load | 35,475 ms | 36,120 ms |
| Fixed-prompt generation | 3,226 ms | 3,247 ms |
| Post-generation process monitor | 549,248K, about 536 MiB | 714,854,400 bytes, about 682 MiB; UI shows 682MB |

Earlier normal-fixture snapshots were about 945 MiB in Chrome and 1,042 MiB in
Firefox. These are observations with different run histories, not promises of a
fixed percentage reduction. Chrome's Linux RSS high-water mark in the selected
normal run was 774,360 KiB, about 756 MiB. Process-monitor footprint/Firefox
resident-unique values are different from total RSS and are not peak measurements.

Chrome logged three `Unable to add response to browser cache` warnings with
`Cache.put` internal errors; inference still completed. Cache reliability remains
unverified for task 0.5. The test environment's `/tmp` is a 1.9 GB tmpfs and was
81% used when checked; no cause for the warnings was established. No cache fix or
later cache-audit task is claimed here. Firefox automation kept the known
600,000 ms test-profile idle timeout; default background lifetime is task 0.7.

## Reproduce the comparisons

From the repository root, prepare and run selected Chrome benchmark cases:

```sh
sh experiments/phase0/prepare.sh
BUTU_CHROME=/home/rupam/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
  node experiments/phase0/src/model-host/memory-benchmark.cjs \
  flan-t5-quality smollm-q8-quality minilm-l3-quality \
  baseline-q4-quality baseline-l6-quality
```

The legacy memory-matrix cases explicitly select the old q4/L6 baseline, so the
[earlier memory experiments](MEMORY.md) remain reproducible after default changes.
`selected-defaults` exercises the new pair sequentially. Candidate model IDs,
revisions, dtypes and pipeline task remain centralized in `src/config.js`.

For Firefox worker comparisons, use the temporary-fixture procedure in
[MEMORY.md](MEMORY.md#reproduce-on-linux), replacing its `startMemoryCase` options:

```js
// Selected text format; six representative prompts.
{ text: true, textCandidate: 'smollm-q8', textSuite: true,
  tokens: 25, worker: true, idleDelays: [5000, 10000, 15000] }
// Rejected FLAN-T5 comparison: set textCandidate to true instead.
// Selected embeddings; all three relevance fixtures.
{ embedding: true, embeddingCandidate: true, embeddingSuite: true,
  worker: true, idleDelays: [5000, 10000, 15000] }
```

### Normal Chrome load/test steps

1. Run `sh experiments/phase0/prepare.sh`. Launch a separate Chrome test process
   with `--user-data-dir=/tmp/butu-phase0-manual --offscreen-document-testing`.
2. Open `chrome://extensions`, enable Developer mode, Load unpacked
   `/home/rupam/butu/experiments/phase0/chrome/`.
3. Inspect `offscreen.html`. Confirm the L3/q8 embedding header, three DBMS scores
   above and ranking PASS, then the SmolLM2/q8 header, raw output and generation ms.
4. Record before/after memory with Shift+Esc. Treat the echoed generation as a
   text-quality failure despite successful inference. Remove the test extension.

### Normal Firefox load/test steps

1. Run the same prepare command. Record Extensions memory in `about:processes`.
2. In `about:debugging` → This Firefox → Load Temporary Add-on, select
   `/home/rupam/butu/experiments/phase0/manifest.json`.
3. Click Inspect and keep it open. Confirm the same model headers, DBMS scores,
   ranking PASS, raw output and generation-time logs as Chrome.
4. Record Extensions memory in `about:processes`, then Remove the temporary add-on.

## Credits and captured evidence

- [FLAN-T5-small](https://huggingface.co/google/flan-t5-small), Google, Apache-2.0;
  [ONNX export](https://huggingface.co/Xenova/flan-t5-small), Xenova, tested at
  `311454e83bc784267fd7eef5940ee854144abbec` but not adopted.
- [paraphrase-MiniLM-L3-v2](https://huggingface.co/sentence-transformers/paraphrase-MiniLM-L3-v2),
  Sentence Transformers contributors, Apache-2.0;
  [ONNX export](https://huggingface.co/Xenova/paraphrase-MiniLM-L3-v2), Xenova.
- Existing SmolLM2/MHA and MiniLM-L6 credits remain in [README.md](README.md).
  Weights are downloaded, not committed. No dependency, permission or host was added.

All raw captures are in [results/2026-10-29-models](results/2026-10-29-models/).
Files named `current-text-quality`/`current-embedding-quality` captured the old
defaults before selection; their reproducible cases are now `baseline-q4-quality`
and `baseline-l6-quality`. JSON `pass` marks runtime/ranking completion, not prose
quality. Normal-entry-point evidence:

- Chrome: [data](results/2026-10-29-models/chrome-selected-defaults.json),
  [Task Manager](results/2026-10-29-models/chrome-selected-after.png).
- Firefox: [data](results/2026-10-29-models/firefox-selected-defaults.json),
  [about:processes](results/2026-10-29-models/firefox-selected-after.png).
