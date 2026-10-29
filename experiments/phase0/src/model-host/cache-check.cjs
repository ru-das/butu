// Node 22, stdlib only. Run after prepare.sh. Isolated profile; the chrome://extensions Reload API.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = path.resolve(__dirname, '../../../..');
const output = process.env.BUTU_CACHE_RESULTS ?? '/tmp/butu-cache-chrome';
if (!process.env.BUTU_CHROME) throw new Error('Set BUTU_CHROME to Chrome for Testing');
fs.mkdirSync(output, { recursive: true });
const fixture = path.join(output, 'extension');
const profile = path.join(output, 'profile');
if (fs.existsSync(profile)) throw new Error('Use a fresh BUTU_CACHE_RESULTS directory for a cold test');
fs.cpSync(path.join(root, 'experiments/phase0/chrome'), fixture, { recursive: true });
const worker = path.join(fixture, 'src/model-host/embedding-worker.js');
fs.writeFileSync(worker, "import './cache-probe.js';\n" + fs.readFileSync(worker, 'utf8'));
const host = path.join(fixture, 'src/model-host/embedding-host.js');
fs.writeFileSync(host, fs.readFileSync(host, 'utf8').replace('this.receive(worker, data)',
    "(console.log('[cache-audit]', JSON.stringify(data.cacheAudit)), this.receive(worker, data))"));
async function connect(url, onEvent = () => {}) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (!message.id) return onEvent(message);
        const waiter = pending.get(message.id);
        pending.delete(message.id);
        if (waiter) message.error ? waiter.reject(message.error) : waiter.resolve(message.result);
    };
    return {
        call(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = ++sequence;
                pending.set(id, { resolve, reject });
                socket.send(JSON.stringify({ id, method, params }));
            });
        },
        close() { socket.close(); },
    };
}
(async () => {
    const log = fs.openSync(path.join(output, 'browser.log'), 'w');
    const child = spawn(process.env.BUTU_CHROME, ['--headless', '--no-sandbox', '--disable-gpu',
        '--disable-background-networking', '--no-first-run', '--enable-unsafe-extension-debugging',
        `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'],
        { stdio: ['ignore', log, log] });
    const result = { runs: [] };
    let browser, page;
    try {
        let endpoint;
        for (let i = 0; i < 100; i++) {
            try {
                const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
                endpoint = `http://127.0.0.1:${Number(port)}`;
                const version = await (await fetch(`${endpoint}/json/version`)).json();
                browser = await connect(version.webSocketDebuggerUrl);
                const info = await browser.call('SystemInfo.getProcessInfo');
                if (!info.processInfo.some(p => p.type === 'browser' && p.id === child.pid)) throw new Error('Wrong browser');
                result.browser = version.Browser;
                break;
            } catch { await pause(200); }
        }
        if (!browser) throw new Error('No browser debugger');
        await browser.call('Extensions.loadUnpacked', { path: fixture });
        let previousTarget;
        for (const label of ['cold', 'reload']) {
            let target;
            for (let i = 0; i < 200; i++) {
                const list = await (await fetch(`${endpoint}/json/list`)).json();
                target = list.find(t => t.url.endsWith('/src/model-host/offscreen.html') && t.id !== previousTarget);
                if (target) break;
                await pause(100);
            }
            if (!target) throw new Error('No new offscreen document: ' + JSON.stringify(await (await fetch(`${endpoint}/json/list`)).json()));
            const run = { label, target: target.id, audits: [], network: [] };
            result.runs.push(run);
            page = await connect(target.webSocketDebuggerUrl, message => {
                if (message.method === 'Runtime.consoleAPICalled') {
                    const args = message.params.args.map(arg => arg.value ?? arg.description);
                    if (args[0] === '[cache-audit]') run.audits.push(JSON.parse(args[1]));
                }
                if (message.method === 'Network.requestWillBeSent') run.network.push(message.params.request.url);
            });
            await page.call('Runtime.enable');
            await page.call('Network.enable');
            const deadline = Date.now() + 180000;
            while (Date.now() < deadline) {
                const current = await page.call('Runtime.evaluate', { expression: 'globalThis.phase0Result', returnByValue: true });
                if (current.result.value) { run.runtime = current.result.value; break; }
                await pause(200);
            }
            if (!run.runtime?.passed || run.audits.length !== 1) throw new Error('Inference/audit failed');
            const snapshot = await page.call('Runtime.evaluate', { expression: `(async()=>{
                const cache=await caches.open('transformers-cache');
                return Promise.all((await cache.keys()).map(async r=>({url:r.url,bytes:(await (await cache.match(r)).arrayBuffer()).byteLength})));
            })()`, awaitPromise: true, returnByValue: true });
            run.entries = snapshot.result.value;
            if (!run.entries?.some(e => e.url.endsWith('.onnx') && e.bytes > 1000000)) throw new Error('Missing cached weights');
            console.log(label, JSON.stringify(run.audits[0]));
            if (label === 'cold') {
                if (!run.audits[0].fetches.length) throw new Error('Cold control did not download');
                previousTarget = target.id;
                // Use the same API as the chrome://extensions Reload button.
                const { targetId } = await browser.call('Target.createTarget', { url: 'chrome://extensions/' });
                const controls = await (await fetch(`${endpoint}/json/list`)).json();
                const control = await connect(controls.find(t => t.id === targetId).webSocketDebuggerUrl);
                let loaded = false;
                for (let i = 0; i < 100; i++) {
                    const ready = await control.call('Runtime.evaluate', { expression: '!!globalThis.chrome?.developerPrivate?.reload', returnByValue: true });
                    if (ready.result.value) { loaded = true; break; }
                    await pause(100);
                }
                if (!loaded) throw new Error('Extensions management page did not load');
                const developerMode = await control.call('Runtime.evaluate', {
                    expression: 'chrome.developerPrivate.updateProfileConfiguration({inDeveloperMode:true})',
                    awaitPromise: true, returnByValue: true,
                });
                if (developerMode.exceptionDetails) throw new Error(JSON.stringify(developerMode));
                page.close(); page = null;
                const reloaded = await control.call('Runtime.evaluate', {
                    expression: `chrome.developerPrivate.reload('${new URL(target.url).host}', {failQuietly: true, populateErrorForUnpacked: true})`,
                    awaitPromise: true, returnByValue: true,
                });
                if (reloaded.exceptionDetails) throw new Error(JSON.stringify(reloaded));
                control.close();
                await pause(500);
            } else {
                if (run.audits[0].fetches.length || run.audits[0].misses.length ||
                    run.audits[0].hits.length !== result.runs[0].entries.length) throw new Error('Reload missed persistent model cache');
                if (run.network.some(url => /^https?:/.test(url))) throw new Error('Remote network request after reload');
            }
        }
        result.pass = true;
    } catch (error) { result.error = String(error); process.exitCode = 1; console.error(error); }
    finally {
        fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
        page?.close();
        if (browser) { await Promise.race([browser.call('Browser.close').catch(() => {}), pause(2000)]); browser.close(); }
        if (child.exitCode === null) child.kill();
        fs.closeSync(log);
    }
})();
