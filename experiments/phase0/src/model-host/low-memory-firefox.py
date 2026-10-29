"""Linux/stdlib Firefox verifier: normal entry point plus bounded-input checks."""
import base64
import json
import os
import pathlib
import re
import shutil
import socket
import subprocess
import threading
import time

root = pathlib.Path(__file__).resolve().parents[4]
out = pathlib.Path(os.environ.get('BUTU_MEMORY_RESULTS', '/tmp/butu-low-memory-firefox'))
out.mkdir(parents=True, exist_ok=True)
profile = out / 'profile'
profile.mkdir(exist_ok=True)
# Test profile only: this is not task 0.7's default-lifetime verification.
(profile / 'user.js').write_text('user_pref("marionette.port", 2839);\n'
    'user_pref("devtools.console.stdout.content", true);\n'
    'user_pref("devtools.console.stdout.chrome", true);\n'
    'user_pref("extensions.background.idle.timeout", 600000);\n')
fixture = out / 'extension'
fixture.mkdir(exist_ok=True)
source = root / 'experiments/phase0'
for name in ['manifest.json', 'background.html', 'background.js']:
    shutil.copy2(source / name, fixture / name)
for name in ['src', 'vendor']:
    shutil.copytree(source / name, fixture / name, dirs_exist_ok=True)
# Exercise the same public host after the normal entry point has finished.
with (fixture / 'background.js').open('a') as file:
    file.write('''
phase0Done.then(async () => {
    if (!phase0Result.passed) return;
    const host = phase0Host;
    try {
        const task = 'Learn JavaScript promises and async await';
        const related = ('JavaScript promises async await tutorial. ').repeat(30).slice(0,1024);
        const {EMBEDDING_QUALITY_CASES}=await import('./src/model-host/model-fixtures.js');
        const quality=[];
        for(const test of EMBEDDING_QUALITY_CASES){
            const positive=(await host.compare(test.task,test.related)).scores;
            const negative=(await host.compare(test.task,test.unrelated)).scores;
            quality.push({task:test.task,positive,negative,passed:Math.min(...positive)>Math.max(...negative)});
        }
        const result = await host.compare(task, [related, 'IPL cricket highlights']);
        const overflow = await host.compare(task, ['x'.repeat(1025)]).then(()=>false,()=>true);
        const pending = host.compare(task, ['A different page']).then(()=>false,()=>true);
        host.release();
        console.log('[phase0] Bounds:', JSON.stringify({quality,scores:result.scores,
            ranked:result.scores[0]>result.scores[1], overflowRejected:overflow, cancelled:await pending}));
    } catch (error) { console.error('[phase0] Bounds FAILED:', String(error)); }
    finally { host.release(); }
});
''')
log = (out / 'browser.log').open('w')
child = subprocess.Popen([os.environ.get('BUTU_FIREFOX', 'firefox'), '--headless', '--no-remote',
    '--profile', str(profile), '--marionette', '--remote-allow-system-access', 'about:processes'], stdout=log, stderr=log)
result = {'samples': []}
stop = threading.Event()
sampler = None
try:
    for _ in range(100):
        try:
            connection = socket.create_connection(('127.0.0.1', 2839), timeout=2)
            break
        except OSError:
            time.sleep(.2)
    else:
        raise RuntimeError('Cannot connect to test Firefox')
    connection.settimeout(60)
    def read():
        size = b''
        while (part := connection.recv(1)) != b':':
            if not part:
                raise RuntimeError('Marionette connection closed')
            size += part
        data = b''
        while len(data) < int(size):
            part = connection.recv(int(size) - len(data))
            if not part:
                raise RuntimeError('Marionette response truncated')
            data += part
        return json.loads(data)
    read()
    sequence = 0
    def call(name, arguments=None):
        global sequence
        sequence += 1
        data = json.dumps([0, sequence, name, arguments or {}]).encode()
        connection.sendall(str(len(data)).encode() + b':' + data)
        response = read()
        if response[2]:
            raise RuntimeError(response[2])
        return response[3]
    result['session'] = call('WebDriver:NewSession', {'capabilities': {}})
    if result['session']['capabilities']['moz:processID'] != child.pid:
        raise RuntimeError('Marionette port belongs to another browser')
    call('WebDriver:SetWindowRect', {'width': 1400, 'height': 900})
    def capture(name):
        call('Marionette:SetContext', {'value': 'content'})
        (out / (name + '.txt')).write_text(json.dumps(call('WebDriver:ExecuteScript',
            {'script': 'return document.body.innerText', 'args': []}), indent=2))
        shot = call('WebDriver:TakeScreenshot', {'full': True})
        (out / (name + '.png')).write_bytes(base64.b64decode(shot['value']))
    time.sleep(2)
    capture('before')
    call('Marionette:SetContext', {'value': 'chrome'})
    process_script = 'return ChromeUtils.requestProcInfo().then(p=>p.children.filter(c=>c.type==="extension").map(c=>({pid:c.pid,memory:c.memory})))'
    before = call('WebDriver:ExecuteScript', {'script': process_script, 'args': []})
    result['before'] = before
    print(call('Addon:Install', {'path': str(fixture), 'temporary': True}), flush=True)
    info = call('WebDriver:ExecuteScript', {'script': process_script, 'args': []})
    pid = info['value'][0]['pid']
    def sample():
        while not stop.is_set():
            try:
                status = pathlib.Path(f'/proc/{pid}/status').read_text()
                smaps = pathlib.Path(f'/proc/{pid}/smaps_rollup').read_text()
                def field(text, key):
                    match = re.search(r'^' + key + r':\s+(\d+)', text, re.M)
                    return int(match[1]) if match else 0
                result['samples'].append({'time': time.monotonic(), 'pid': pid,
                    'rssKiB': field(status, 'VmRSS'), 'hwmKiB': field(status, 'VmHWM'),
                    'privateKiB': field(smaps, 'Private_Clean') + field(smaps, 'Private_Dirty'),
                    'swapKiB': field(smaps, 'Swap')})
            except OSError:
                pass
            stop.wait(.25)
    sampler = threading.Thread(target=sample)
    sampler.start()
    seen = 0
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        lines = (out / 'browser.log').read_text().splitlines()
        for line in lines[seen:]:
            if '[phase0]' in line:
                print(line, flush=True)
            for marker, key in [('console.log: "[phase0] Result:" ', 'runtime'), ('console.log: "[phase0] Bounds:" ', 'bounds')]:
                if marker in line:
                    result[key] = json.loads(json.loads(line.split(marker, 1)[1]))
            if '[phase0] FAILED:' in line or '[phase0] Bounds FAILED:' in line:
                raise RuntimeError(line)
        seen = len(lines)
        if result.get('runtime') and result.get('bounds'):
            break
        time.sleep(.25)
    if not result.get('runtime', {}).get('passed') or not all(result.get('bounds', {}).get(k) for k in ['ranked', 'overflowRejected', 'cancelled']):
        raise RuntimeError('Runtime/bounds verification failed or timed out')
    if not all(test['passed'] for test in result['bounds']['quality']):
        raise RuntimeError('Embedding relevance regression')
    time.sleep(30)
    result['after'] = call('WebDriver:ExecuteScript', {'script': process_script, 'args': []})
    capture('after')
    result['peakRssKiB'] = max(s['rssKiB'] for s in result['samples'])
    result['peakHwmKiB'] = max(s['hwmKiB'] for s in result['samples'])
    result['budget'] = {'metric': 'largest observed extension renderer HWM',
        'limitBytes': result['runtime']['rendererBudgetBytes'],
        'withinTarget': result['peakHwmKiB'] * 1024 < result['runtime']['rendererBudgetBytes']}
    if not result['budget']['withinTarget']:
        raise RuntimeError('Extension renderer exceeded the configured memory target')
    result['pass'] = True
    print('PASS', json.dumps({'peakMiB': result['peakHwmKiB'] / 1024, 'after': result['after']}), flush=True)
except Exception as error:
    result['error'] = str(error)
    raise
finally:
    stop.set()
    if sampler:
        sampler.join()
    (out / 'result.json').write_text(json.dumps(result, indent=2))
    if child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=15)
        except subprocess.TimeoutExpired:
            child.kill()
    log.close()
