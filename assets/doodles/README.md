# Butu’s crayon doodles

16 original SVG drawings authored for Butu with Codex, 2026-10-30. No stock art,
traced third-party artwork, image model, raster images or remote resources.
Butu preserves the rounded teddy, muzzle, tummy and feet of the existing original
`src/popup/butu.svg` drawing. All artwork in this directory is dedicated to the
public domain under **CC0 1.0 Universal**; see [LICENSE](LICENSE). The bundled
handwriting fonts used on the test sheet retain their own OFL licences in
`assets/fonts/`.

## Inventory

All character and small doodle SVGs use a transparent `0 0 120 120` viewBox.
Uneven Bézier outlines, offset retracing and a tiny repeating luminance mask
make the crayon texture. Each file is self-contained: no external references,
filters, JavaScript, animation or embedded fonts. Rounded stroke caps and joins
keep the corruption soft. They can be used as ordinary images or backgrounds.
The existing popup drawing is unchanged; wiring the new assets into haunting
belongs to task 3.4.

| File | Appearance |
| --- | --- |
| `butu-calm.svg` | Warm peach, relaxed paws, small smile |
| `butu-waiting.svg` | Listening tilt, fading smile, paws close together |
| `butu-lonely.svg` | Drooping head, viewer-facing eyes, sagging ear, dark paw/seam strokes |
| `butu-wrong.svg` | Overdrawn eyes, lifted mouth corner, misaligned traced outlines |
| `butu-abandoned.svg` | Drained colour, outstretched paws, surrounding scribbles, small uneven smile returns |
| `stars-calm.svg`, `stars-corrupted.svg` | Butter-yellow stars → faded and scribbled over |
| `smiley-calm.svg`, `smiley-corrupted.svg` | Sky-blue smile → flat mouth, overdrawn eyes |
| `heart-calm.svg`, `heart-corrupted.svg` | Rose heart → drained colour, repeated crayon crossings |
| `flower-calm.svg`, `flower-corrupted.svg` | Lavender petals and sage stem → faded, scribbled centre |
| `scribble-1.svg` | Two wandering crayon loops |
| `scribble-2.svg` | Five tangled gestures; includes all of overlay 1 |
| `scribble-3.svg` | Nine frantic gestures; includes all of overlay 2 |

Scribble overlays have a transparent `0 0 640 200` viewBox. Size or tile them in
future haunting CSS, with `pointer-events: none` on the overlay element. The
bear variants are character states from SPEC.md, not a new timing configuration.
Calm is companion artwork; stage 0 must remain free of on-page doodles.
Everything is already static with reduced motion enabled.

## Test sheet

Open `src/doodle-test/index.html` directly from the checkout; no server required.
The same sheet is copied to `dist/<browser>/src/doodle-test/index.html` by
`./build.sh`. It shows all five bear states, the four other calm/corrupted pairs,
40px size samples, three overlays on identical prose, and a dark-paper
transparency check. It uses the existing shared theme and bundled fonts.
No extension session, model download or API key is needed.

## Exact manual checks — Chrome

1. Run `./build.sh`. Open `chrome://extensions`, enable Developer mode and load
   unpacked `dist/chrome` (or reload the existing Butu extension).
2. Copy Butu’s extension ID. Open
   `chrome-extension://<ID>/src/doodle-test/index.html` in a new tab.
3. At a desktop window width of at least 1100px, compare all five bears in one
   row. Check the listening tilt, droop and sagging ear, overdrawn eyes, then
   outstretched paws and the returning uneven smile. Each must read as the same
   teddy; there are no claws, teeth or graphic damage.
4. Compare each calm/corrupted pair. The smiley loses its smile; the same stars,
   heart and flower remain recognisable. Check the 40px samples remain legible.
5. Compare all three overlays on the identical sample paragraph: loops → tangles
   → frantic scribbles. Expand “Check transparency on dark paper”; there must
   be no rectangular cream/white background behind any SVG.
6. Resize to 390px wide using DevTools: bears wrap, pairs stay side by side and
   overlay examples stack. Check no horizontal page overflow. Tab through the
   section links and the expandable summary; focus must stay visible.
7. In DevTools Rendering, emulate `prefers-reduced-motion: reduce`: every drawing
   stays static. In Network, clear the log and reload; all page resources must
   come from this extension, with no HTTP(S) asset requests. Switch Network to
   Offline and reload again; fonts and every doodle still render.

## Exact manual checks — Firefox

1. Run `./build.sh`. Open `about:debugging` → This Firefox → Load Temporary Add-on
   → choose `dist/firefox/manifest.json` (or reload the existing temporary add-on).
2. In Butu’s entry, copy its Internal UUID. Open
   `moz-extension://<UUID>/src/doodle-test/index.html` in a new tab.
3. Repeat Chrome checks 3–5: all five teddy expressions, four paired doodles,
   40px samples, increasing scribbles and dark-paper transparency.
4. Use Responsive Design Mode at 390px; verify wrapping and no horizontal page
   overflow. Tab through links and the expandable summary to check visible focus.
5. Enable reduced motion in the OS or Firefox DevTools accessibility simulation;
   all drawings stay static. In Network, clear and reload: every resource must
   come from this extension. Enable Work Offline and reload to verify the same
   fonts and images still render.

## Verification recorded for task 3.3

- `./build.sh` passes; the test sheet and all assets are copied to both outputs.
- `node --test tests/*.test.js`: 29 tests pass.
- All 16 SVGs parse as XML and contain no external resource references or scripts;
  combined SVG size is 27,524 bytes.
- Headless Chromium: visually inspected the source sheet at 1400px and the built
  Chrome sheet at 390px, with the expected layout and images.
- Headless Firefox 154.0.1: inspected the built Firefox sheet at 1400px;
  automated image/font/resource/overflow checks passed at 1400px and 500px
  (Firefox’s headless window minimum). All 28 displayed image instances loaded,
  both bundled fonts loaded, zero HTTP(S) resources and no horizontal overflow.
  These rendering checks used local file URLs; installed-extension checks and
  Firefox’s 390px Responsive Design Mode check are the manual steps above.
- The design detector only flagged the cream palette, which SPEC.md explicitly
  requires and the existing shared theme supplies.
