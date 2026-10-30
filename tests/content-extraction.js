import { extractPageText } from '../src/content/extract.js';
import { PAGE_MAIN_TEXT_CHARS } from '../src/config.js';

const frame = document.createElement('iframe');
document.body.append(frame);
let checks = 0;
function equal(actual, expected) {
    checks++;
    if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
async function page(markup) {
    const loaded = new Promise((resolve) => { frame.onload = resolve; });
    frame.srcdoc = markup;
    await loaded;
    return frame.contentDocument;
}

try {
    const doc = await page(`<!doctype html><title> Study   DBMS </title>
        <meta name="Description" content=" Database   notes ">
        <nav>Top navigation</nav><aside>Sidebar noise</aside>
        <main><nav>Inside navigation</nav><footer>Inside footer</footer>
        <div role="navigation">Menu</div><div role="contentinfo">Copyright</div>
        <p hidden>Hidden</p><div style="display:none"><p>Hidden descendant</p></div>
        <p style="visibility:hidden">Invisible</p><p style="opacity:0">Transparent</p>
        <div style="opacity:0"><p>Transparent descendant</p></div>
        <p style="content-visibility:hidden">Skipped content</p><p aria-hidden="true">ARIA hidden</p>
        <input value="Private"><textarea>Private draft</textarea><select><option>Private choice</option></select>
        <div contenteditable>Private editor</div><script type="text/plain">Script text</script>
        <style>main { color: black; }</style><template>Template text</template>
        <details><summary hidden>Summary</summary>Closed details</details>
        <h1>Database systems</h1><p>Transactions   and <em>locks</em>.</p>
        </main><footer>Bottom footer</footer>`);
    const original = doc.documentElement.outerHTML;
    const result = extractPageText(doc);
    equal(result.title, 'Study DBMS');
    equal(result.description, 'Database notes');
    equal(result.mainText, 'Database systems Transactions and locks.');
    equal(doc.documentElement.outerHTML, original);

    equal(extractPageText(await page('<nav>Menu</nav><article>Article notes</article><p>Noise</p>')).mainText, 'Article notes');
    equal(extractPageText(await page('<main hidden>Hidden main</main><div role="main">Role main</div>')).mainText, 'Role main');
    equal(extractPageText(await page('<nav>Menu</nav><p>Body fallback</p><footer>Footer</footer>')).mainText, 'Body fallback');
    equal(extractPageText(await page('<nav><main>Wrong main</main></nav><article>Real article</article>')).mainText, 'Real article');
    equal(extractPageText(await page('<main><div style="visibility:hidden">Hidden <b style="visibility:visible">Visible child</b></div><div style="display:contents">Contents text</div></main>')).mainText, 'Visible child Contents text');
    equal(extractPageText(await page('<main><p style="margin-top:5000px">Below the fold</p></main>')).mainText, 'Below the fold');
    equal(extractPageText(await page('<main>data<b>base</b> <em>notes</em>.<p>Next paragraph</p></main>')).mainText, 'database notes. Next paragraph');
    equal(extractPageText(await page('<main>First<br>second</main>')).mainText, 'First second');
    equal(extractPageText(await page('<main>' + 'word '.repeat(200) + '</main>')).mainText.length, PAGE_MAIN_TEXT_CHARS);
    equal(extractPageText(await page('<body></body>')).mainText, '');
    equal(extractPageText(frame.contentDocument).description, '');
    frame.contentDocument.body.textContent = 'Updated page';
    equal(extractPageText(frame.contentDocument).mainText, 'Updated page');

    // Exercise the real classic-script entry point, using local module URLs.
    let listener;
    window.chrome = { storage: {
        onChanged: { addListener() {} }, local: { get: (key, callback) => callback({}) },
    }, runtime: {
        id: 'butu-check',
        getURL: (path) => new URL(`../${path}`, location.href).href,
        onMessage: { addListener: (callback) => { listener = callback; } },
    } };
    await import('../src/content/content.js');
    equal(listener({ type: 'unrelated' }, { id: 'butu-check' }, () => {}), undefined);
    equal(listener({ type: 'page:extract' }, { id: 'other' }, () => {}), undefined);
    const main = document.createElement('main');
    main.textContent = 'Fresh content';
    document.body.append(main);
    const request = () => new Promise((resolve) => {
        equal(listener({ type: 'page:extract' }, { id: 'butu-check' }, resolve), true);
    });
    equal((await request()).mainText, 'Fresh content');
    main.textContent = 'Changed content';
    equal((await request()).mainText, 'Changed content');
    main.remove();
    document.querySelector('#result').textContent = `PASS: ${checks} extraction checks`;
} catch (error) {
    document.querySelector('#result').textContent = `FAIL: ${error.stack}`;
} finally {
    frame.remove();
}
