// Linux/Node 22 test harness. Does not use a personal Chrome profile.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = path.resolve(__dirname, '../../../..');
const output = process.env.BUTU_MEMORY_RESULTS ?? path.join(os.tmpdir(), 'butu-low-memory-chrome');
const executable = process.env.BUTU_CHROME;
if (!executable) throw new Error('Set BUTU_CHROME to a Chrome for Testing executable');
fs.mkdirSync(output, { recursive: true });
const fixture = path.join(output, 'extension');
const profile = path.join(output, 'profile');
fs.cpSync(path.join(root, 'experiments/phase0/chrome'), fixture, { recursive: true });

async function connect(url, onEvent = () => {}) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (!message.id) { onEvent(message); return; }
        const waiter = pending.get(message.id);
        if (!waiter) return;
        pending.delete(message.id);
        message.error ? waiter.reject(message.error) : waiter.resolve(message.result);
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
    const child = spawn(executable, ['--headless', '--no-sandbox', '--disable-gpu',
        '--disable-background-networking', '--no-first-run', '--enable-unsafe-extension-debugging',
        `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'],
    { stdio: ['ignore', log, log] });
    const result = { lines: [], samples: [], peakRendererHwmKiB: 0, peakCandidateRssKiB: 0 };
    let browser, page;
    try {
        let endpoint;
        for (let i = 0; i < 100; i++) {
            try {
                const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
                endpoint = `http://127.0.0.1:${Number(port)}`;
                const version = await (await fetch(`${endpoint}/json/version`)).json();
                const candidate = await connect(version.webSocketDebuggerUrl);
                const info = await candidate.call('SystemInfo.getProcessInfo');
                if (!info.processInfo.some(p => p.type === 'browser' && p.id === child.pid)) {
                    candidate.close(); throw new Error('Debug port belongs to another browser');
                }
                browser = candidate; result.browser = version.Browser; break;
            } catch { await pause(200); }
        }
        if (!browser) throw new Error('Cannot connect to the test browser');
        async function sample() {
            const { processInfo } = await browser.call('SystemInfo.getProcessInfo');
            const processes = [];
            for (const p of processInfo.filter(p => p.type === 'renderer')) {
                try {
                    if (!fs.readFileSync(`/proc/${p.id}/cmdline`, 'utf8').includes('--extension-process')) continue;
                    const status = fs.readFileSync(`/proc/${p.id}/status`, 'utf8');
                    const smaps = fs.readFileSync(`/proc/${p.id}/smaps_rollup`, 'utf8');
                    const field = (text, key) => Number(text.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'))?.[1] ?? 0);
                    processes.push({ pid: p.id, rssKiB: field(status, 'VmRSS'), hwmKiB: field(status, 'VmHWM'),
                        privateKiB: field(smaps, 'Private_Clean') + field(smaps, 'Private_Dirty'), swapKiB: field(smaps, 'Swap') });
                } catch { /* A spare renderer can exit between listing and reading. */ }
            }
            result.samples.push({ time: Date.now(), processes });
            result.peakRendererHwmKiB = Math.max(result.peakRendererHwmKiB, ...processes.map(p => p.hwmKiB));
            result.peakCandidateRssKiB = Math.max(result.peakCandidateRssKiB, processes.reduce((sum, p) => sum + p.rssKiB, 0));
        }
        await browser.call('Extensions.loadUnpacked', { path: fixture });
        let target;
        for (let i = 0; i < 100; i++) {
            const list = await (await fetch(`${endpoint}/json/list`)).json();
            target = list.find(t => t.url.endsWith('/src/model-host/offscreen.html'));
            if (target) break;
            await pause(100);
        }
        if (!target) throw new Error('No offscreen document');
        page = await connect(target.webSocketDebuggerUrl, message => {
            if (message.method === 'Runtime.consoleAPICalled') {
                const line = message.params.args.map(arg => arg.value ?? arg.description).join(' ');
                result.lines.push(line); console.log(line);
            }
            if (message.method === 'Runtime.exceptionThrown') result.exception = message.params;
        });
        await page.call('Runtime.enable');
        const deadline = Date.now() + 180000;
        while (Date.now() < deadline) {
            await sample();
            const current = await page.call('Runtime.evaluate', { expression: 'globalThis.phase0Result', returnByValue: true });
            if (current.result.value) { result.runtime = current.result.value; break; }
            await pause(250);
        }
        if (!result.runtime?.passed || result.exception) throw new Error('Normal runtime verification failed or timed out');
        // Also exercise bounded long input, then release an active job immediately.
        let edgeFinished=false;
        const edgeRequest=page.call('Runtime.evaluate', {
            expression: `(async()=>{
                const host = phase0Host;
                const task='Learn JavaScript promises and async await';
                const related=('JavaScript promises async await tutorial. ').repeat(30).slice(0,1024);
                const {EMBEDDING_QUALITY_CASES}=await import(chrome.runtime.getURL('src/model-host/model-fixtures.js'));
                const quality=[];
                for(const test of EMBEDDING_QUALITY_CASES){
                    const positive=(await host.compare(test.task,test.related)).scores;
                    const negative=(await host.compare(test.task,test.unrelated)).scores;
                    quality.push({task:test.task,positive,negative,passed:Math.min(...positive)>Math.max(...negative)});
                }
                const result=await host.compare(task,[related,'IPL cricket highlights']);
                const overflow=await host.compare(task,['x'.repeat(1025)]).then(()=>false,()=>true);
                const pending=host.compare(task,['A different page']).then(()=>false,()=>true);
                host.release();
                return {quality,scores:result.scores,ranked:result.scores[0]>result.scores[1],overflowRejected:overflow,cancelled:await pending};
            })()`, awaitPromise: true, returnByValue: true,
        }).then(value=>{edgeFinished=true;return value},error=>{edgeFinished=true;return {error:String(error)}});
        while(!edgeFinished){await sample();await pause(250)}
        const edge=await edgeRequest;
        if(edge.error||edge.exceptionDetails)throw new Error(JSON.stringify(edge));
        result.bounds = edge.result.value;
        await sample();
        if (!result.bounds?.ranked || !result.bounds.overflowRejected || !result.bounds.cancelled || !result.bounds.quality?.every(test=>test.passed)) throw new Error('Bound/cancellation verification failed');
        const idleEnd = Date.now() + 30000;
        while (Date.now() < idleEnd) { await sample(); await pause(500); }
        result.final = result.samples.at(-1);
        result.budget = { metric: 'largest observed individual renderer HWM', limitBytes: result.runtime.rendererBudgetBytes,
            withinTarget: result.peakRendererHwmKiB * 1024 < result.runtime.rendererBudgetBytes };
        if (!result.budget.withinTarget) throw new Error('Individual renderer exceeded the configured memory target');
        result.pass = true;
        console.log('PASS', JSON.stringify({ peakRendererMiB: result.peakRendererHwmKiB / 1024,
            peakCandidateRssMiB: result.peakCandidateRssKiB / 1024, final: result.final }));
    } catch (error) {
        result.error = String(error); process.exitCode = 1; console.error(error);
    } finally {
        fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
        page?.close();
        if (browser) { await Promise.race([browser.call('Browser.close').catch(() => {}), pause(2000)]); browser.close(); }
        if (child.exitCode === null) child.kill();
        fs.closeSync(log);
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
