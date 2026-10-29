"""Firefox/Marionette cache audit, stdlib only; isolated profile, actual add-on reload."""
import json
import os
import pathlib
import shutil
import socket
import subprocess
import time

root = pathlib.Path(__file__).resolve().parents[4]
out = pathlib.Path(os.environ.get('BUTU_CACHE_RESULTS', '/tmp/butu-cache-firefox'))
out.mkdir(parents=True, exist_ok=True)
profile = out / 'profile'
if profile.exists():
    raise RuntimeError('Use a fresh BUTU_CACHE_RESULTS directory for a cold test')
profile.mkdir()
(profile / 'user.js').write_text('user_pref("marionette.port", 2840);\n'
    'user_pref("devtools.console.stdout.content", true);\n'
    'user_pref("devtools.console.stdout.chrome", true);\n'
    'user_pref("extensions.background.idle.timeout", 600000);\n')
fixture = out / 'extension'
fixture.mkdir()
source = root / 'experiments/phase0'
for name in ['manifest.json', 'background.html', 'background.js']:
    shutil.copy2(source / name, fixture / name)
for name in ['src', 'vendor']:
    shutil.copytree(source / name, fixture / name)
worker = fixture / 'src/model-host/embedding-worker.js'
worker.write_text("import './cache-probe.js';\n" + worker.read_text())
host = fixture / 'src/model-host/embedding-host.js'
host.write_text(host.read_text().replace('this.receive(worker, data)',
    "(console.log('[cache-audit]', JSON.stringify(data.cacheAudit)), this.receive(worker, data))"))
# Snapshot bytes from the extension's own origin, after successful inference.
with (fixture / 'background.js').open('a') as file:
    file.write('''
phase0Done.then(async()=>{
    const cache=await caches.open('transformers-cache');
    const entries=await Promise.all((await cache.keys()).map(async r=>({url:r.url,
        bytes:(await (await cache.match(r)).arrayBuffer()).byteLength})));
    console.log('[cache-entries]',JSON.stringify(entries));
});
''')
log = (out / 'browser.log').open('w')
child = subprocess.Popen([os.environ.get('BUTU_FIREFOX', 'firefox'), '--headless', '--no-remote',
    '--profile', str(profile), '--marionette', '--remote-allow-system-access', 'about:blank'], stdout=log, stderr=log)
result = {'runs': []}
try:
    for _ in range(100):
        try:
            connection = socket.create_connection(('127.0.0.1', 2840), timeout=2)
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
                raise RuntimeError('Marionette closed')
            size += part
        data = b''
        while len(data) < int(size):
            part = connection.recv(int(size) - len(data))
            if not part:
                raise RuntimeError('Marionette truncated')
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
    def script(code):
        return call('WebDriver:ExecuteScript', {'script': code, 'args': [], 'newSandbox': False})['value']
    session = call('WebDriver:NewSession', {'capabilities': {}})
    if session['capabilities']['moz:processID'] != child.pid:
        raise RuntimeError('Wrong browser')
    result['browser'] = session['capabilities']['browserVersion']
    call('Marionette:SetContext', {'value': 'chrome'})
    script(r'''window.cacheNetwork=[];
        window.cacheObserver={observe(subject){
            const url=subject.QueryInterface(Ci.nsIHttpChannel).URI.spec;
            if (/^https:\/\/([^/]*\.)?(huggingface\.co|hf\.co)\//.test(url)) window.cacheNetwork.push(url);
        }};
        Services.obs.addObserver(window.cacheObserver,'http-on-modify-request');''')
    call('Addon:Install', {'path': str(fixture), 'temporary': True})
    seen = 0
    for label in ['cold', 'reload']:
        run = {'label': label, 'audits': []}
        result['runs'].append(run)
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            lines = (out / 'browser.log').read_text().splitlines()
            for line in lines[seen:]:
                for marker, key in [('console.log: "[cache-audit]" ', 'audits'),
                                    ('console.log: "[phase0] Result:" ', 'runtime'),
                                    ('console.log: "[cache-entries]" ', 'entries')]:
                    if marker in line:
                        value = json.loads(json.loads(line.split(marker, 1)[1]))
                        if key == 'audits':
                            run[key].append(value)
                        else:
                            run[key] = value
                if '[phase0] FAILED:' in line:
                    raise RuntimeError(line)
            seen = len(lines)
            if run.get('runtime') and run.get('entries'):
                break
            time.sleep(.2)
        run['network'] = script('return window.cacheNetwork.splice(0)')
        if not run.get('runtime', {}).get('passed') or len(run['audits']) != 1:
            raise RuntimeError('Inference/audit failed')
        if not any(e['url'].endswith('.onnx') and e['bytes'] > 1000000 for e in run['entries']):
            raise RuntimeError('Missing cached weights')
        audit = run['audits'][0]
        print(label, json.dumps(audit), flush=True)
        if label == 'cold':
            if not audit['fetches'] or not run['network']:
                raise RuntimeError('Cold control did not download')
            script('''const {AddonManager}=ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
                return AddonManager.getAddonByID('phase0@butu.test').then(addon=>addon.reload());''')
        elif audit['fetches'] or audit['misses'] or run['network'] or len(audit['hits']) != len(result['runs'][0]['entries']):
            raise RuntimeError('Reload missed persistent model cache')
    result['pass'] = True
except Exception as error:
    result['error'] = str(error)
    raise
finally:
    (out / 'result.json').write_text(json.dumps(result, indent=2))
    if child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=15)
        except subprocess.TimeoutExpired:
            child.kill()
    log.close()
