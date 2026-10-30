// Real DOM coverage; no model, remote assets or runtime test hooks.
import { RETURN_FADE_MS } from '../src/config.js';
import { possessionTemplates } from '../src/lib/possession.js';
import { formatTemplate } from '../src/lib/templates.js';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let changed, listener, tick, stage = 0, checks = 0, clicks = 0;
let response;
const realSetInterval = window.setInterval;
const realClearInterval = window.clearInterval;
const realInfo = console.info;
const provenance = [];
const session = { startedAt: Date.now(), endsAt: Date.now() + 600000, task: 'Study databases' };
function check(ok, label) { checks++; if (!ok) throw Error(label); }
try {
    console.info = (message, detail) => {
        if (message === 'Butu text') provenance.push(detail);
        else realInfo(message, detail);
    };
    window.setInterval = fn => { tick = fn; return 1; };
    window.clearInterval = () => {};
    window.chrome = {
        runtime: {
            id: 'bear', getURL: path => new URL(`../${path}`, location.href).href,
            onMessage: { addListener: fn => { listener = fn; } },
            sendMessage: (msg, cb) => { response = cb; cb({ url: location.href, stage }); },
        },
        storage: { local: { get: (key, cb) => cb({ session }) },
            onChanged: { addListener: fn => { changed = fn; } } },
    };
    const main = document.querySelector('main');
    const original = main.outerHTML;
    const nodes = [...main.querySelectorAll('*')];
    const text = document.querySelector('h1').firstChild;
    const link = document.querySelector('h1 a');
    link.addEventListener('click', event => { event.preventDefault(); clicks++; });
    const input = document.querySelector('input');
    input.value = 'A draft typed after page load';
    input.setSelectionRange(3, 8);
    await import('../src/content/content.js');
    for (let attempt = 0; !tick && attempt < 100; attempt++) await pause(50);
    check(!document.querySelector('[data-butu-haunt-root]'), 'grace period leaves no overlay');
    const selected = possessionTemplates(session, location.href);
    const headingText = document.querySelector('h1').textContent;
    for (stage = 1; stage <= 4; stage++) {
        tick();
        check(document.querySelector('[data-butu-stage]')?.dataset.butuStage === String(stage), `stage ${stage}`);
        check(stage === 1 ? main.outerHTML === original : document.querySelector('h1').textContent ===
            formatTemplate(selected.taunt, { task: session.task, heading: headingText }), 'stage 2 uses authored task/heading text');
        check(document.querySelector('.butu-haunt-line').textContent === formatTemplate(selected.stage4, session), 'stage 4 names the task using its cached template');
        check(document.querySelector('form h2').textContent === 'A form heading', 'form heading unchanged');
        check(document.querySelector('[contenteditable] h2').textContent === 'Editable title', 'editor unchanged');
        check(getComputedStyle(document.querySelector('.butu-haunt-butu')).backgroundImage.includes(
            ['waiting', 'lonely', 'wrong', 'abandoned'][stage - 1]), 'correct bear');
        const overlay = document.querySelector('[data-butu-haunt-root]');
        check([overlay, ...overlay.querySelectorAll('*')].every(node =>
            getComputedStyle(node).animationName === 'none'), `stage ${stage} has no looping motion`);
        check([...overlay.children].every(node => getComputedStyle(node).transitionDuration === '0s'),
            `stage ${stage} drawings and text stay static`);
        check(getComputedStyle(overlay).transitionProperty === 'opacity', 'return transition is opacity only');
    }
    check(provenance.filter(entry => entry.kind === 'taunt').length === 2 &&
        provenance.filter(entry => entry.kind === 'stage4').length === 1, 'each shown line logs template provenance');
    const logged = provenance.length;
    stage = 4; tick();
    check(provenance.length === logged, 'unchanged timing ticks do not log lines again');
    check(provenance.every(entry => entry.source === 'template' &&
        Object.keys(entry).every(key => ['source', 'kind'].includes(key))), 'provenance never contains task text, heading text or URLs');
    link.click();
    check(clicks === 1 && link === document.querySelector('h1 a'), 'original link handler and identity survive');
    changed({ offTaskTiming: { newValue: { activeTabId: 2, tabs: { 2: { onTask: true } } } } }, 'local');
    check(main.outerHTML === original && document.querySelector('h1').firstChild === text, 'return restores markup and text node identity');
    await pause(RETURN_FADE_MS / 2);
    const fading = document.querySelector('[data-butu-returning]');
    check(fading && +getComputedStyle(fading).opacity > 0 && +getComputedStyle(fading).opacity < 1,
        'return gently fades rather than moving or disappearing instantly');
    changed({ offTaskTiming: { newValue: { activeTabId: 2, tabs: { 2: { onTask: true } } } } }, 'local');
    await pause(RETURN_FADE_MS / 2 + 100);
    check(!document.querySelector('[data-butu-haunt-root]'), 'repeated work ticks do not restart the fade');
    check(![...document.fonts].some(font => font.family === 'Butu Haunt Hand'), 'temporary font registration removed');
    check(nodes.every((node, i) => main.querySelectorAll('*')[i] === node), 'all original descendants preserved');
    check(input.value === 'A draft typed after page load' && input.selectionStart === 3 && input.selectionEnd === 8, 'unsaved value and selection preserved');
    stage = 4; tick(); input.focus();
    check(main.outerHTML === original && !document.querySelector('[data-butu-haunt-root]'), 'focused form immediately restores');
    tick(); check(!document.querySelector('[data-butu-haunt-root]'), 'cannot haunt a focused form');
    input.blur(); await pause(10); tick();
    check(!!document.querySelector('[data-butu-stage="4"]'), 'resumes after leaving field');
    check(document.querySelector('h1').textContent === formatTemplate(selected.taunt, { task: session.task, heading: headingText }), 'return and form restore retain the original template and heading value');
    let extraction;
    await new Promise(resolve => {
        listener({ type: 'page:extract' }, { id: 'bear' }, result => { extraction = result; resolve(); });
    });
    check(main.outerHTML === original && !extraction.mainText.includes(session.task), 'extraction uses original text');
    tick();
    check(document.querySelector('h1').textContent === formatTemplate(selected.taunt, { task: session.task, heading: headingText }), 'extraction restore does not change the page choice');
    const originalUrl = location.href;
    const nextUrl = new URL('?another-page', originalUrl).href;
    history.pushState(null, '', nextUrl);
    tick();
    const nextChoice = possessionTemplates(session, nextUrl);
    check(document.querySelector('h1').textContent === formatTemplate(nextChoice.taunt, { task: session.task, heading: headingText }), 'SPA navigation restores before applying the new page choice');
    check(document.querySelector('.butu-haunt-line').textContent === formatTemplate(nextChoice.stage4, session), 'SPA navigation updates the central line');
    history.replaceState(null, '', originalUrl);
    tick();
    check(document.querySelector('h1').textContent === formatTemplate(selected.taunt, { task: session.task, heading: headingText }), 'SPA revisit keeps its earlier template choice');
    const malicious = { ...session, startedAt: session.startedAt + 1, task: '<img src=x onerror=alert(1)>{heading}$&' };
    changed({ session: { newValue: malicious } }, 'local');
    check(document.querySelector('.butu-haunt-line').textContent.includes(malicious.task) &&
        !document.querySelector('.butu-haunt-line img'), 'new session task is literal text, never HTML');
    changed({ session: { newValue: null } }, 'local');
    response({ url: location.href, stage: 4 });
    check(main.outerHTML === original && !document.querySelector('[data-butu-haunt-root]'), 'stop and stale callback restore completely');
    document.querySelector('#result').textContent = `PASS: ${checks} haunting checks`;
} catch (error) {
    document.querySelector('#result').textContent = `FAIL: ${error.stack}`;
} finally {
    window.setInterval = realSetInterval;
    window.clearInterval = realClearInterval;
    console.info = realInfo;
}
