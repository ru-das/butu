# Shared paper and lettering

Extension pages include `../shared/theme.css`. It supplies local font faces,
cream paper with a static repeating texture, pastel colour tokens, readable
brown ink, heading/body typography, selection colour and keyboard focus rings.
Do not inject this stylesheet into visited pages.

Patrick Hand is the body face (20px); Gaegu is the heading face (40/32/24px).
Both are bundled under the SIL OFL 1.1 with credits and full licence text in
`assets/fonts/`. Cursive is the fallback while local files load.
Use `--butu-ink` or `--butu-ink-soft` for text; the pastel tokens are surfaces
and decoration, not text colours. Keep the calm palette unchanged for popup
and diary. Page corruption belongs to the later content styles.

`paper.svg` is original geometric paper-fibre artwork created for Butu,
dedicated to the public domain under CC0 1.0 Universal:
https://creativecommons.org/publicdomain/zero/1.0/
No external source image, filter, animation or script is used. It remains
static with reduced motion and is removed in forced-colours mode.

The popup and otherwise blank diary are typography verification shells for
task 1.3. Session controls and diary content are later tasks.

## Verification

Run `./build.sh` and `node --test tests/*.test.js`.

Chrome:

1. At `chrome://extensions`, enable Developer mode and load `dist/chrome/`
   (or reload the existing Butu extension). Note its extension ID.
2. Click Butu's toolbar icon: confirm cream textured paper, a Gaegu “Butu”
   heading and Patrick Hand body copy, with no horizontal scrolling.
3. Open `chrome-extension://<ID>/src/diary/diary.html` in a tab. Confirm the
   same paper and “Our diary” heading, with the rest of the page empty.
4. Disconnect the network. Close/reopen the popup and reload the diary.
   Both should retain their fonts and texture.
5. Inspect each page: in Network, reload with cache disabled; font and SVG
   requests must use only `chrome-extension://` URLs. In Elements, confirm
   rendered heading/body fonts are Gaegu/Patrick Hand, not the fallback.

Firefox:

1. At `about:debugging#/runtime/this-firefox`, Load Temporary Add-on and
   choose `dist/firefox/manifest.json` (or reload Butu).
2. Click Butu's toolbar icon: confirm cream textured paper, a Gaegu “Butu”
   heading and Patrick Hand body copy, with no horizontal scrolling.
3. From Butu's debugging entry, copy its Internal UUID. Open
   `moz-extension://<UUID>/src/diary/diary.html`. Confirm the same paper
   and “Our diary” heading, with the rest of the page empty.
4. Use File → Work Offline (show the menu bar with Alt if needed), then
   close/reopen the popup and reload the diary. Both should retain fonts
   and texture. Turn Work Offline off afterwards.
5. Inspect the popup with the Browser Toolbox and the diary with ordinary
   DevTools. Reload with cache disabled: font/SVG requests must use only
   `moz-extension://` URLs. The Fonts panel should show Gaegu for the heading
   and Patrick Hand for body copy.

For both browsers, enable the OS reduced-motion preference and repeat the
visual check: there should be no motion. No key, model or session is needed.
